#!/usr/bin/env python3
"""
Festival Information Updater

This script automatically updates existing festival information.
It uses OpenAI GPT API to gather information from various sources and creates structured updates.

Usage:
    python festival_updater.py --update-existing=true
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List

from openai import OpenAI
from dotenv import load_dotenv

# Constants
FESTIVALS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db.json")
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "prompt.md")
# OPENAI_MODEL = "gpt-5"
OPENAI_MODEL = "gpt-4.1-mini"
SYSTEM_INSTRUCTIONS = """
You are a data extraction assistant.
Always return valid compact JSON: {"bands":["..."],"ticketPrice":"..."}.
Never include explanations or commentary.
"""


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class FestivalUpdater:
    """Main class for updating festival information."""

    def __init__(self):
        """Initialize the festival updater with necessary clients."""
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.update_existing_festivals_prompt = self._load_prompt_file(PROMPT_FILE)

        # Load current festival data
        self.current_festivals = self._load_festivals()
        self.updates_made = []
        self.new_festivals = []
        self.sources = {}

    def _ask_openai(self, prompt):
        response = self.openai_client.responses.create(
            model=OPENAI_MODEL,
            instructions=SYSTEM_INSTRUCTIONS,
            input=prompt,
            tools=[{"type": "web_search"}],
            temperature=0.3,
        )
        print(f" == Request usage: {response.usage}")
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

    def _load_festivals(self) -> List[Dict]:
        """Load current festival data from db.json."""
        try:
            with open("db.json", "r", encoding="utf-8") as f:
                return json.load(f)["festivals"]
        except FileNotFoundError:
            logger.error("db.json not found")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing db.json: {e}")
            return []

    def _save_festivals(self, festivals: List[Dict]) -> None:
        """Save updated festival data to db.json."""
        db_json = { "festivals": festivals }
        with open("db.json", "w", encoding="utf-8") as f:
            json.dump(db_json, f, indent=2, ensure_ascii=False)

    def _search_festival_info(self, festival_name: str, festival_url: str, location: str = "") -> Dict:
        """Search for festival information using OpenAI."""
        prompt_template_filled = (
            self.update_existing_festivals_prompt.replace("{{ FESTIVAL_NAME }}", festival_name)
            .replace("{{ FESTIVAL_LOCATION }}", location)
            .replace("{{ FESTIVAL_URL }}", festival_url)
        )

        try:
            content = self._ask_openai(prompt_template_filled)

            return json.loads(content)

        except Exception as e:
            logger.error(f"Error searching for {festival_name}: {e}")
            return {}

    def update_existing_festivals(self) -> None:
        """Update information for existing festivals."""
        logger.info("Updating existing festivals...")

        for i, festival in enumerate(self.current_festivals):
            festival_name = festival.get("name", "")
            url = festival.get("website", "")
            location = festival.get("location", "")

            logger.info(f"Updating {festival_name}...")

            # Search for updated information
            updated_info = self._search_festival_info(festival_name, url, location)

            if not updated_info:
                continue

            changes = []

            # Update bands if new ones are found
            if updated_info.get("bands") and len(updated_info["bands"]) > len(festival.get("bands", [])):
                old_bands = set(festival.get("bands", []))
                new_bands = set(updated_info["bands"])
                added_bands = new_bands - old_bands

                if added_bands:
                    festival["bands"] = updated_info["bands"]
                    changes.append(f"Added bands: {', '.join(added_bands)}")

            # Update ticket price if available and different
            if updated_info.get("ticketPrice") != "" and updated_info["ticketPrice"] != festival.get("ticketPrice"):
                old_price = festival.get("ticketPrice", "Unknown")
                festival["ticketPrice"] = updated_info["ticketPrice"]
                changes.append(f"Updated ticket price: {old_price}€ → {updated_info['ticketPrice']}€")

            if changes:
                self.updates_made.append({
                    "festival": festival_name,
                    "changes": changes,
                    "sources": updated_info.get("sources", []),
                    "confidence": updated_info.get("confidence", "medium")
                })
                self.current_festivals[i] = festival

    def generate_pr_summary(self) -> str:
        """Generate a summary for the pull request."""
        summary_parts = []

        # Header
        summary_parts.append("# 🎸 Automated Festival Information Update")
        summary_parts.append("")
        summary_parts.append(f"**Update Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        summary_parts.append("")

        # Summary
        total_changes = len(self.updates_made) + len(self.new_festivals)
        summary_parts.append("## 📊 Summary")
        summary_parts.append(f"- **Existing festivals updated:** {len(self.updates_made)}")
        summary_parts.append(f"- **New festivals added:** {len(self.new_festivals)}")
        summary_parts.append(f"- **Total changes:** {total_changes}")
        summary_parts.append("")

        # Existing festivals updates
        if self.updates_made:
            summary_parts.append("## 🔄 Updated Festivals")
            summary_parts.append("")

            for update in self.updates_made:
                summary_parts.append(f"### {update['festival']}")
                summary_parts.append(f"**Confidence:** {update['confidence']}")
                summary_parts.append("**Changes:**")
                for change in update["changes"]:
                    summary_parts.append(f"- {change}")

                if update["sources"]:
                    summary_parts.append("**Sources:**")
                    for source in update["sources"]:
                        summary_parts.append(f"- {source}")

                summary_parts.append("")

        # New festivals
        if self.new_festivals:
            summary_parts.append("## ✨ New Festivals Added")
            summary_parts.append("")

            for new_festival in self.new_festivals:
                festival = new_festival["festival"]
                summary_parts.append(f"### {festival['name']}")
                summary_parts.append(f"**Location:** {festival['location']}")
                summary_parts.append(f"**Dates:** {festival['dates'].get('start', 'TBD')} to {festival['dates'].get('end', 'TBD')}")
                summary_parts.append(f"**Ticket Price:** €{festival.get('ticketPrice', 'TBD')}")
                summary_parts.append(f"**Website:** {festival.get('website', 'TBD')}")
                summary_parts.append(f"**Confidence:** {new_festival['confidence']}")

                if festival.get("bands"):
                    summary_parts.append(f"**Bands:** {', '.join(festival['bands'][:5])}")
                    if len(festival["bands"]) > 5:
                        summary_parts.append(f" (and {len(festival['bands']) - 5} more)")

                if new_festival["sources"]:
                    summary_parts.append("**Sources:**")
                    for source in new_festival["sources"]:
                        summary_parts.append(f"- {source}")

                summary_parts.append("")

        # Footer
        summary_parts.append("---")
        summary_parts.append("🤖 This update was automatically generated using AI-powered festival information gathering.")
        summary_parts.append("Please review all changes carefully before merging.")

        return "\n".join(summary_parts)

    def run(self, update_existing: bool = True) -> None:
        """Run the festival updater."""
        logger.info("Starting festival information update...")

        if update_existing:
            self.update_existing_festivals()

        if self.updates_made:
            self._save_festivals(self.current_festivals)

            # Generate PR summary
            summary = self.generate_pr_summary()
            with open("festival_update_summary.md", "w", encoding="utf-8") as f:
                f.write(summary)

            logger.info(f"Update complete! {len(self.updates_made)} festivals updated.")
        else:
            logger.info("No updates found.")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Update festival information")
    parser.add_argument("--update-existing", type=str, default="true", help="Update existing festivals")

    args = parser.parse_args()

    # Convert string boolean arguments
    update_existing = args.update_existing.lower() == "true"

    # Load all environment variables from .env file if exists
    load_dotenv()

    # Check for required environment variables
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("OPENAI_API_KEY environment variable is required")
        sys.exit(1)

    try:
        updater = FestivalUpdater()
        updater.run(update_existing=update_existing)
    except Exception as e:
        logger.error(f"Error running festival updater: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
