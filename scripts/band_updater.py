#!/usr/bin/env python3
"""
Band Information Updater

This script automatically retrieves and updates band information for bands that:
1. Exist in festival lineups but not in the bands array
2. Exist in the bands array but have incomplete information

Usage:
    python band_updater.py --add-missing=true --update-incomplete=true
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Set

from openai import OpenAI
from dotenv import load_dotenv

# Constants
DB_FILE_NAME = "db.json"
FESTIVALS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), DB_FILE_NAME)
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "band_prompt.md")
OPENAI_MODEL = "gpt-4.1-mini"
SYSTEM_INSTRUCTIONS = """
Metal band data curator.
Return valid compact JSON only: {"key":"...","name":"...","country":"...","description":"...","headlineImage":"...","logo":"...","website":"...","spotify":"...","genres":["..."],"members":[{"name":"...","role":"..."}]}.
No explanations.
"""

# Required fields for a complete band entry
REQUIRED_FIELDS = [
    "key", "name", "country", "description", "headlineImage",
    "logo", "website", "spotify", "genres", "members"
]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class BandUpdater:
    """Main class for updating band information."""

    def __init__(self):
        """Initialize the band updater with necessary clients."""
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.band_prompt_template = self._load_prompt_file(PROMPT_FILE)
        self.total_used_tokens = 0

        # Load current data
        self.db_data = self._load_database()
        self.festivals = self.db_data.get("festivals", [])
        self.bands = self.db_data.get("bands", [])

        self.updates_made = []
        self.bands_added = []
        self.failed_bands = []

    def _ask_openai(self, prompt: str) -> str:
        """Query OpenAI API with web search capability."""
        response = self.openai_client.responses.create(
            model=OPENAI_MODEL,
            instructions=SYSTEM_INSTRUCTIONS,
            input=prompt,
            tools=[{"type": "web_search"}],
            temperature=0.3,
        )
        logger.info(f" == Request usage: {response.usage}")
        self.total_used_tokens += response.usage.total_tokens
        return response.output_text

    def _load_prompt_file(self, filepath: str) -> str:
        """Load prompt template from a file."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Prompt file {filepath} not found")
            return ""
        except Exception as e:
            logger.error(f"Error loading prompt file {filepath}: {e}")
            return ""

    def _load_database(self) -> Dict:
        """Load current database from db.json."""
        try:
            with open(DB_FILE_NAME, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"{DB_FILE_NAME} not found")
            return {"festivals": [], "bands": []}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing {DB_FILE_NAME}: {e}")
            return {"festivals": [], "bands": []}

    def _save_database(self) -> None:
        """Save updated database to db.json."""
        self.db_data["bands"] = self.bands
        with open(DB_FILE_NAME, "w", encoding="utf-8") as f:
            json.dump(self.db_data, f, indent=2, ensure_ascii=False)

    def _get_band_by_name(self, band_name: str) -> Optional[Dict]:
        """Find a band in the bands array by name (case-insensitive)."""
        normalized_name = band_name.lower().strip()
        for band in self.bands:
            if band.get("name", "").lower().strip() == normalized_name:
                return band
        return None

    def _collect_all_festival_bands(self) -> Set[str]:
        """Collect all unique band names from festival lineups."""
        all_bands = set()
        for festival in self.festivals:
            bands = festival.get("bands", [])
            all_bands.update(band.strip() for band in bands)
        return all_bands

    def _generate_band_key(self, band_name: str) -> str:
        """Generate a URL-friendly key from band name."""
        import re
        key = band_name.lower()
        key = re.sub(r'[^a-z0-9\s-]', '', key)
        key = re.sub(r'[\s]+', '-', key)
        key = re.sub(r'-+', '-', key)
        return key.strip('-')

    def _search_band_info(self, band_name: str) -> Optional[Dict]:
        """Search for band information using OpenAI."""
        prompt = self.band_prompt_template.replace("{{ BAND_NAME }}", band_name)
        content = ""

        try:
            content = self._ask_openai(prompt)

            # Parse JSON response
            band_data = json.loads(content)

            # Check if band was found
            if "error" in band_data:
                logger.warning(f"Band not found: {band_name}")
                return None

            # Ensure key is generated if not provided
            if not band_data.get("key"):
                band_data["key"] = self._generate_band_key(band_name)

            return band_data

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON for {band_name}: {e}")
            logger.error(f"Content: {content}")
            return None
        except Exception as e:
            logger.error(f"Error searching for {band_name}: {e}")
            return None

    def _merge_band_data(self, existing: Dict, new_data: Dict) -> Dict:
        """Merge new band data with existing data, preferring new data for empty fields."""
        merged = existing.copy()

        for field in REQUIRED_FIELDS:
            # Update if field is missing or empty in existing data
            if field not in merged or not merged[field]:
                if field in new_data and new_data[field]:
                    merged[field] = new_data[field]
            # Update if existing data is incomplete
            elif field == "genres" and len(merged[field]) == 0 and new_data.get(field):
                merged[field] = new_data[field]
            elif field == "members" and len(merged[field]) == 0 and new_data.get(field):
                merged[field] = new_data[field]
            elif field == "description" and len(merged[field]) < 100 and new_data.get(field):
                merged[field] = new_data[field]

        return merged

    def add_missing_bands(self) -> None:
        """Add bands that exist in festival lineups but not in bands array."""
        logger.info("Checking for missing bands...")

        # Get all bands from festivals
        festival_bands = self._collect_all_festival_bands()

        # Get existing band names
        existing_band_names = {band.get("name", "").lower().strip() for band in self.bands}

        # Find missing bands
        missing_bands = [
            band for band in festival_bands
            if band.lower().strip() not in existing_band_names
        ]

        logger.info(f"Found {len(missing_bands)} missing bands")

        for band_name in missing_bands:
            logger.info(f"Searching for: {band_name}")

            band_data = self._search_band_info(band_name)

            if band_data:
                self.bands.append(band_data)
                self.bands_added.append({
                    "name": band_name,
                    "data": band_data,
                    "confidence": band_data.get("confidence", "medium"),
                    "sources": band_data.get("sources", [])
                })
                logger.info(f"✓ Added: {band_name}")
            else:
                self.failed_bands.append(band_name)
                logger.warning(f"✗ Failed to add: {band_name}")

    def generate_summary(self) -> str:
        """Generate a summary for the pull request."""
        summary_parts = []

        # Header
        summary_parts.append("# 🎸 Automated Band Information Update")
        summary_parts.append("")
        summary_parts.append(f"**Update Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        summary_parts.append("")

        # Summary
        summary_parts.append("## 📊 Summary")
        summary_parts.append(f"- **New bands added:** {len(self.bands_added)}")
        summary_parts.append(f"- **Existing bands updated:** {len(self.updates_made)}")
        summary_parts.append(f"- **Failed to retrieve:** {len(self.failed_bands)}")
        summary_parts.append(f"- **Total tokens used:** {self.total_used_tokens}")
        summary_parts.append("")

        # New bands added
        if self.bands_added:
            summary_parts.append("## ✨ New Bands Added")
            summary_parts.append("")

            for band_info in self.bands_added:
                summary_parts.append(f"### {band_info['name']}")
                data = band_info['data']
                summary_parts.append(f"**Country:** {data.get('country', 'N/A')}")
                summary_parts.append(f"**Genres:** {', '.join(data.get('genres', []))}")
                summary_parts.append(f"**Members:** {len(data.get('members', []))} member(s)")
                summary_parts.append(f"**Website:** {data.get('website', 'N/A')}")
                summary_parts.append(f"**Confidence:** {band_info['confidence']}")

                if band_info['sources']:
                    summary_parts.append("**Sources:**")
                    for source in band_info['sources']:
                        summary_parts.append(f"- {source}")

                summary_parts.append("")

        # Failed bands
        if self.failed_bands:
            summary_parts.append("## ⚠️ Failed to Retrieve")
            summary_parts.append("")
            summary_parts.append("The following bands could not be found or retrieved:")
            summary_parts.append("")
            for band in self.failed_bands:
                summary_parts.append(f"- {band}")
            summary_parts.append("")

        # Footer
        summary_parts.append("---")
        summary_parts.append("🤖 This update was automatically generated using AI-powered band information gathering.")
        summary_parts.append("Please review all changes carefully before merging, especially:")
        summary_parts.append("- Verify band member information is current")
        summary_parts.append("- Check that image URLs are accessible and appropriate")
        summary_parts.append("- Confirm genre classifications are accurate")
        summary_parts.append("- Validate Spotify and website links")

        return "\n".join(summary_parts)

    def run(self, add_missing: bool = True) -> None:
        """Run the band updater."""
        logger.info("Starting band information update...")

        if add_missing:
            self.add_missing_bands()

        if self.bands_added or self.updates_made:
            self._save_database()

            # Generate summary
            summary = self.generate_summary()
            with open("band_update_summary.md", "w", encoding="utf-8") as f:
                f.write(summary)

            logger.info(
                f"Update complete! {len(self.bands_added)} bands added, "
                f"{len(self.updates_made)} bands updated."
            )
        else:
            logger.info("No updates made.")

        logger.info(f"Total tokens used: {self.total_used_tokens}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Update band information")
    parser.add_argument(
        "--add-missing",
        type=str,
        default="true",
        help="Add bands from festivals that don't exist in bands array"
    )

    args = parser.parse_args()

    # Convert string boolean arguments
    add_missing = args.add_missing.lower() == "true"

    # Load environment variables
    load_dotenv()

    # Check for required environment variables
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("OPENAI_API_KEY environment variable is required")
        sys.exit(1)

    try:
        updater = BandUpdater()
        updater.run(add_missing=add_missing)
    except Exception as e:
        logger.error(f"Error running band updater: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
