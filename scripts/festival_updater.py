#!/usr/bin/env python3
"""
Festival Information Updater

This script automatically updates existing festival information and discovers new European metal festivals.
It uses OpenAI GPT API to gather information from various sources and creates structured updates.

Usage:
    python festival_updater.py --update-existing=true --find-new=true
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from geopy.geocoders import Nominatim
from openai import OpenAI

# Constants
FESTIVALS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.json')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FestivalUpdater:
    """Main class for updating festival information."""

    def __init__(self):
        """Initialize the festival updater with necessary clients."""
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.geocoder = Nominatim(user_agent="metal-festivals-updater")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; MetalFestivalsBot/1.0)'
        })

        # Load current festival data
        self.current_festivals = self._load_festivals()
        self.updates_made = []
        self.new_festivals = []
        self.sources = {}

    def _load_festivals(self) -> List[Dict]:
        """Load current festival data from db.json."""
        try:
            with open('db.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error("db.json not found")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing db.json: {e}")
            return []

    def _save_festivals(self, festivals: List[Dict]) -> None:
        """Save updated festival data to db.json."""
        with open('db.json', 'w', encoding='utf-8') as f:
            json.dump(festivals, f, indent=2, ensure_ascii=False)

    def _get_coordinates(self, location: str) -> Optional[Tuple[float, float]]:
        """Get coordinates for a given location."""
        try:
            location_data = self.geocoder.geocode(location)
            if location_data:
                return (location_data.latitude, location_data.longitude)
        except Exception as e:
            logger.warning(f"Could not geocode {location}: {e}")
        return None

    def _search_festival_info(self, festival_name: str, location: str = "") -> Dict:
        """Search for festival information using OpenAI."""
        prompt = f"""
        Search for detailed information about the metal festival "{festival_name}" {f"in {location}" if location else ""}.

        Please provide the following information in JSON format:
        {{
            "name": "Official festival name",
            "dates": {{
                "start": "2026-MM-DD",
                "end": "2026-MM-DD"
            }},
            "location": "City, Country",
            "website": "Official website URL",
            "bands": ["List", "of", "confirmed", "bands"],
            "ticketPrice": "Basic ticket price in euros (number only)",
            "poster": "Official poster/logo URL if available",
            "sources": ["List of sources where information was found"],
            "confidence": "high/medium/low based on source reliability"
        }}

        Important guidelines:
        1. Only include confirmed information from official sources
        2. For dates, assume 2026 unless specified otherwise
        3. For ticket prices, find the cheapest available option (day pass, early bird, etc.)
        4. Only include European metal festivals
        5. Provide sources for verification
        6. If information is not found or uncertain, use null

        Focus on official festival websites, ticketing platforms, and reliable music news sources.
        """

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant specialized in finding information about European metal music festivals. Always provide accurate, verifiable information with sources."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500
            )

            content = response.choices[0].message.content

            # Extract JSON from the response
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            else:
                # Try to parse the entire content as JSON
                return json.loads(content)

        except Exception as e:
            logger.error(f"Error searching for {festival_name}: {e}")
            return {}

    def _find_new_festivals(self) -> List[Dict]:
        """Find new European metal festivals for 2026."""
        prompt = """
        Find new European metal festivals for 2026 that are not in this existing list:
        """ + json.dumps([f["name"] for f in self.current_festivals], indent=2) + """

        Search for major European metal festivals happening in 2026. Focus on:
        1. Well-established festivals with confirmed dates
        2. Festivals with significant lineups or reputation
        3. Only include festivals in European countries
        4. Only metal/hard rock/heavy music festivals

        For each festival found, provide information in this JSON format:
        {
            "festivals": [
                {
                    "name": "Festival Name",
                    "dates": {
                        "start": "2026-MM-DD",
                        "end": "2026-MM-DD"
                    },
                    "location": "City, Country",
                    "website": "Official website URL",
                    "bands": ["Confirmed", "bands", "if", "available"],
                    "ticketPrice": "Basic price in euros (number only)",
                    "poster": "Poster/logo URL if available",
                    "sources": ["Sources where information was found"],
                    "confidence": "high/medium/low"
                }
            ]
        }

        Limit to maximum 5 new festivals and only include those with high confidence.
        """

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant specialized in finding information about European metal music festivals. Only provide verified information from reliable sources."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2000
            )

            content = response.choices[0].message.content

            # Extract JSON from the response
            json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(1))
                return data.get('festivals', [])
            else:
                data = json.loads(content)
                return data.get('festivals', [])

        except Exception as e:
            logger.error(f"Error finding new festivals: {e}")
            return []

    def update_existing_festivals(self) -> None:
        """Update information for existing festivals."""
        logger.info("Updating existing festivals...")

        for i, festival in enumerate(self.current_festivals):
            festival_name = festival.get('name', '')
            location = festival.get('location', '')

            logger.info(f"Updating {festival_name}...")

            # Search for updated information
            updated_info = self._search_festival_info(festival_name, location)

            if not updated_info:
                continue

            changes = []
            original_festival = festival.copy()

            # Update bands if new ones are found
            if updated_info.get('bands') and len(updated_info['bands']) > len(festival.get('bands', [])):
                old_bands = set(festival.get('bands', []))
                new_bands = set(updated_info['bands'])
                added_bands = new_bands - old_bands

                if added_bands:
                    festival['bands'] = updated_info['bands']
                    changes.append(f"Added bands: {', '.join(added_bands)}")

            # Update ticket price if available and different
            if updated_info.get('ticketPrice') and updated_info['ticketPrice'] != festival.get('ticketPrice'):
                old_price = festival.get('ticketPrice', 'Unknown')
                festival['ticketPrice'] = updated_info['ticketPrice']
                changes.append(f"Updated ticket price: €{old_price} → €{updated_info['ticketPrice']}")

            # Update website if missing or different
            if updated_info.get('website') and updated_info['website'] != festival.get('website'):
                festival['website'] = updated_info['website']
                changes.append(f"Updated website: {updated_info['website']}")

            # Update poster if missing
            if updated_info.get('poster') and not festival.get('poster'):
                festival['poster'] = updated_info['poster']
                changes.append("Added poster image")

            # Add coordinates if missing
            if not festival.get('coordinates') and festival.get('location'):
                coords = self._get_coordinates(festival['location'])
                if coords:
                    festival['coordinates'] = list(coords)
                    changes.append(f"Added coordinates: {coords}")

            if changes:
                self.updates_made.append({
                    'festival': festival_name,
                    'changes': changes,
                    'sources': updated_info.get('sources', []),
                    'confidence': updated_info.get('confidence', 'medium')
                })
                self.current_festivals[i] = festival

    def find_new_festivals(self) -> None:
        """Find and add new European metal festivals."""
        logger.info("Searching for new festivals...")

        new_festivals_data = self._find_new_festivals()

        for festival_data in new_festivals_data:
            if not festival_data.get('name'):
                continue

            # Check if festival already exists
            existing_names = [f.get('name', '').lower() for f in self.current_festivals]
            if festival_data['name'].lower() in existing_names:
                continue

            # Add coordinates
            if festival_data.get('location') and not festival_data.get('coordinates'):
                coords = self._get_coordinates(festival_data['location'])
                if coords:
                    festival_data['coordinates'] = list(coords)

            # Clean up the festival data
            cleaned_festival = {
                'name': festival_data.get('name', ''),
                'dates': festival_data.get('dates', {}),
                'location': festival_data.get('location', ''),
                'coordinates': festival_data.get('coordinates', []),
                'poster': festival_data.get('poster', ''),
                'website': festival_data.get('website', ''),
                'bands': festival_data.get('bands', []),
                'ticketPrice': festival_data.get('ticketPrice', 0)
            }

            self.new_festivals.append({
                'festival': cleaned_festival,
                'sources': festival_data.get('sources', []),
                'confidence': festival_data.get('confidence', 'medium')
            })

            self.current_festivals.append(cleaned_festival)

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
                for change in update['changes']:
                    summary_parts.append(f"- {change}")

                if update['sources']:
                    summary_parts.append("**Sources:**")
                    for source in update['sources']:
                        summary_parts.append(f"- {source}")

                summary_parts.append("")

        # New festivals
        if self.new_festivals:
            summary_parts.append("## ✨ New Festivals Added")
            summary_parts.append("")

            for new_festival in self.new_festivals:
                festival = new_festival['festival']
                summary_parts.append(f"### {festival['name']}")
                summary_parts.append(f"**Location:** {festival['location']}")
                summary_parts.append(f"**Dates:** {festival['dates'].get('start', 'TBD')} to {festival['dates'].get('end', 'TBD')}")
                summary_parts.append(f"**Ticket Price:** €{festival.get('ticketPrice', 'TBD')}")
                summary_parts.append(f"**Website:** {festival.get('website', 'TBD')}")
                summary_parts.append(f"**Confidence:** {new_festival['confidence']}")

                if festival.get('bands'):
                    summary_parts.append(f"**Bands:** {', '.join(festival['bands'][:5])}")
                    if len(festival['bands']) > 5:
                        summary_parts.append(f" (and {len(festival['bands']) - 5} more)")

                if new_festival['sources']:
                    summary_parts.append("**Sources:**")
                    for source in new_festival['sources']:
                        summary_parts.append(f"- {source}")

                summary_parts.append("")

        # Footer
        summary_parts.append("---")
        summary_parts.append("🤖 This update was automatically generated using AI-powered festival information gathering.")
        summary_parts.append("Please review all changes carefully before merging.")

        return "\n".join(summary_parts)

    def run(self, update_existing: bool = True, find_new: bool = True) -> None:
        """Run the festival updater."""
        logger.info("Starting festival information update...")

        if update_existing:
            self.update_existing_festivals()

        if find_new:
            self.find_new_festivals()

        # Save updated festivals
        if self.updates_made or self.new_festivals:
            self._save_festivals(self.current_festivals)

            # Generate PR summary
            summary = self.generate_pr_summary()
            with open('festival_update_summary.md', 'w', encoding='utf-8') as f:
                f.write(summary)

            logger.info(f"Update complete! {len(self.updates_made)} festivals updated, {len(self.new_festivals)} new festivals added.")
        else:
            logger.info("No updates found.")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Update festival information')
    parser.add_argument('--update-existing', type=str, default='true', help='Update existing festivals')
    parser.add_argument('--find-new', type=str, default='true', help='Find new festivals')

    args = parser.parse_args()

    # Convert string boolean arguments
    update_existing = args.update_existing.lower() == 'true'
    find_new = args.find_new.lower() == 'true'

    # Check for required environment variables
    if not os.getenv('OPENAI_API_KEY'):
        logger.error("OPENAI_API_KEY environment variable is required")
        sys.exit(1)

    try:
        updater = FestivalUpdater()
        updater.run(update_existing=update_existing, find_new=find_new)
    except Exception as e:
        logger.error(f"Error running festival updater: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
