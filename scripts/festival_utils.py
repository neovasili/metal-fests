"""
Festival Search Utilities

Helper functions for searching and validating festival information.
"""

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class FestivalValidator:
    """Validates and cleans festival information."""

    @staticmethod
    def validate_date_format(date_str: str) -> bool:
        """Validate date format (YYYY-MM-DD)."""
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except ValueError:
            return False

    @staticmethod
    def validate_festival_dates(start_date: str, end_date: str) -> bool:
        """Validate that festival dates are logical."""
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')

            # End date should be same or after start date
            if end < start:
                return False

            # Festival shouldn't be longer than 7 days
            duration = (end - start).days + 1
            if duration > 7:
                return False

            # Should be in 2026 (or reasonable future year)
            current_year = datetime.now().year
            if start.year < current_year or start.year > current_year + 2:
                return False

            return True
        except ValueError:
            return False

    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    @staticmethod
    def validate_location(location: str) -> bool:
        """Validate location format (City, Country)."""
        if not location or ',' not in location:
            return False

        parts = location.split(',')
        if len(parts) != 2:
            return False

        city, country = [part.strip() for part in parts]
        return bool(city and country)

    @staticmethod
    def clean_band_name(band_name: str) -> str:
        """Clean and standardize band names."""
        if not band_name:
            return ""

        # Remove extra whitespace
        band_name = ' '.join(band_name.split())

        # Remove common prefixes/suffixes that might cause duplicates
        prefixes_to_remove = ['the ', 'The ']
        for prefix in prefixes_to_remove:
            if band_name.startswith(prefix):
                band_name = band_name[len(prefix):]

        return band_name

    @staticmethod
    def validate_ticket_price(price) -> Optional[float]:
        """Validate and convert ticket price to float."""
        if price is None:
            return None

        if isinstance(price, (int, float)):
            return float(price) if price > 0 else None

        if isinstance(price, str):
            # Extract numbers from string
            price_match = re.search(r'(\d+(?:\.\d+)?)', price.replace(',', '.'))
            if price_match:
                try:
                    return float(price_match.group(1))
                except ValueError:
                    pass

        return None


class FestivalSearchEngine:
    """Advanced festival search functionality."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; MetalFestivalsBot/1.0)'
        })

    def search_festival_websites(self, festival_name: str) -> List[str]:
        """Search for potential festival websites."""
        search_queries = [
            f'"{festival_name}" official website',
            f'{festival_name} metal festival site:',
            f'{festival_name} tickets'
        ]

        # This would typically use a search API, but for demonstration
        # we'll return common patterns
        potential_sites = []

        # Generate potential website URLs based on festival name
        clean_name = re.sub(r'[^\w\s-]', '', festival_name.lower())
        name_parts = clean_name.replace(' ', '')

        potential_domains = [
            f"https://www.{name_parts}.com",
            f"https://www.{name_parts}.net",
            f"https://www.{name_parts}.org",
            f"https://{name_parts}.com",
            f"https://{name_parts}festival.com"
        ]

        for domain in potential_domains:
            try:
                response = self.session.head(domain, timeout=5)
                if response.status_code == 200:
                    potential_sites.append(domain)
            except requests.RequestException:
                continue

        return potential_sites

    def extract_festival_info_from_website(self, url: str) -> Dict:
        """Extract festival information from a website."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            info = {
                'title': soup.title.string if soup.title else "",
                'description': "",
                'dates_found': [],
                'bands_found': [],
                'price_mentions': []
            }

            # Look for meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                info['description'] = meta_desc.get('content', '')

            # Look for dates (common patterns)
            text_content = soup.get_text()
            date_patterns = [
                r'\b(\d{1,2}[.\-/]\d{1,2}[.\-/]20\d{2})\b',
                r'\b(20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})\b',
                r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\b'
            ]

            for pattern in date_patterns:
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                info['dates_found'].extend(matches)

            # Look for band mentions (this is basic - could be enhanced)
            # Common indicators: "lineup", "artists", "bands"
            lineup_sections = soup.find_all(['div', 'section'],
                                          class_=re.compile(r'lineup|artist|band', re.I))

            for section in lineup_sections:
                # Extract potential band names
                band_elements = section.find_all(['a', 'span', 'div'],
                                               string=re.compile(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]*)*$'))
                for element in band_elements:
                    if element.string:
                        info['bands_found'].append(element.string.strip())

            # Look for price mentions
            price_patterns = [
                r'€\s*(\d+(?:[.,]\d{2})?)',
                r'(\d+(?:[.,]\d{2})?)\s*€',
                r'from\s*€?\s*(\d+)',
                r'tickets?\s*:?\s*€?\s*(\d+)'
            ]

            for pattern in price_patterns:
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                info['price_mentions'].extend(matches)

            return info

        except requests.RequestException as e:
            logger.warning(f"Could not fetch {url}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error parsing {url}: {e}")
            return {}


def create_festival_prompt(festival_name: str, location: str = "", existing_info: Dict = None) -> str:
    """Create an optimized prompt for festival information gathering."""

    base_prompt = f"""
    Find the most current and accurate information about the European metal festival "{festival_name}" {f"in {location}" if location else ""}.

    """

    if existing_info:
        base_prompt += f"Current information: {json.dumps(existing_info, indent=2)}\n\n"
        base_prompt += "Please update or fill in missing information.\n\n"

    base_prompt += """
    Provide the information in this exact JSON format:
    {
        "name": "Official festival name",
        "dates": {
            "start": "2026-MM-DD",
            "end": "2026-MM-DD"
        },
        "location": "City, Country",
        "coordinates": [latitude, longitude],
        "website": "Official website URL",
        "bands": ["List", "of", "confirmed", "headliners", "and", "notable", "bands"],
        "ticketPrice": 199,
        "poster": "Official poster/logo URL if available",
        "sources": [
            "Source 1: Official website - https://example.com",
            "Source 2: Ticket platform - https://tickets.example.com",
            "Source 3: Music news - https://news.example.com/article"
        ],
        "confidence": "high",
        "last_updated": "2024-10-05",
        "notes": "Any additional relevant information"
    }

    IMPORTANT GUIDELINES:
    1. Only use information from 2024-2025 sources for 2026 events
    2. Prioritize official festival websites and major ticketing platforms
    3. For ticket prices, find the cheapest available option (early bird, day pass)
    4. Only include confirmed bands, not rumored or wishlist bands
    5. Coordinates should be for the festival location/venue
    6. Use "high" confidence only for official sources, "medium" for reliable music press, "low" for social media/forums
    7. If information is uncertain or not found, use null for that field
    8. Ensure the festival is actually a metal/rock festival in Europe

    Focus your search on:
    - Official festival websites and social media
    - Ticketmaster, Eventim, and other major ticketing platforms
    - Established music news sites (Blabbermouth, Loudwire, Metal Injection)
    - Venue websites and local tourism sites
    """

    return base_prompt
