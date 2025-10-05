"""
Test Script for Festival Updater System

This script validates the festival updater components and provides
debugging information for the automation system.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.append(str(scripts_dir))

try:
    from festival_updater import FestivalUpdater, FESTIVALS_FILE
    from festival_utils import FestivalValidator, FestivalSearchEngine, create_festival_prompt
    from config import EUROPEAN_COUNTRIES, METAL_GENRES, FESTIVAL_KEYWORDS
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all required packages are installed:")
    print("pip install -r requirements.txt")
    sys.exit(1)


def test_configuration():
    """Test configuration and environment setup."""
    print("🔧 Testing Configuration...")

    # Check environment variables
    required_env_vars = ['OPENAI_API_KEY', 'GITHUB_TOKEN']
    missing_vars = []

    for var in required_env_vars:
        if not os.getenv(var):
            missing_vars.append(var)

    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    else:
        print("✅ Environment variables configured")

    # Check configuration constants
    print(f"✅ European countries loaded: {len(EUROPEAN_COUNTRIES)}")
    print(f"✅ Metal genres configured: {len(METAL_GENRES)}")
    print(f"✅ Festival keywords: {len(FESTIVAL_KEYWORDS)}")

    return True


def test_festival_validator():
    """Test the FestivalValidator class."""
    print("\n🧪 Testing Festival Validator...")

    validator = FestivalValidator()

    # Test date validation
    valid_dates = [
        ("2026-06-15", "2026-06-17", True),
        ("2026-12-31", "2026-12-31", True),
        ("2026-06-17", "2026-06-15", False),  # End before start
        ("2025-06-15", "2025-06-22", False),  # Past year
        ("2026-06-15", "2026-06-25", False),  # Too long (11 days)
    ]

    for start, end, expected in valid_dates:
        result = validator.validate_festival_dates(start, end)
        status = "✅" if result == expected else "❌"
        print(f"{status} Date validation: {start} to {end} -> {result}")

    # Test URL validation
    valid_urls = [
        ("https://www.example.com", True),
        ("http://festival.org", True),
        ("not-a-url", False),
        ("", False),
    ]

    for url, expected in valid_urls:
        result = validator.validate_url(url)
        status = "✅" if result == expected else "❌"
        print(f"{status} URL validation: '{url}' -> {result}")

    # Test location validation
    locations = [
        ("Berlin, Germany", True),
        ("Wacken, Germany", True),
        ("Invalid Location", False),
        ("", False),
    ]

    for location, expected in locations:
        result = validator.validate_location(location)
        status = "✅" if result == expected else "❌"
        print(f"{status} Location validation: '{location}' -> {result}")

    print("✅ Festival Validator tests completed")
    return True


def test_festival_search_engine():
    """Test the FestivalSearchEngine class."""
    print("\n🔍 Testing Festival Search Engine...")

    search_engine = FestivalSearchEngine()

    # Test website search (mock)
    test_festival = "Wacken Open Air"
    websites = search_engine.search_festival_websites(test_festival)
    print(f"✅ Website search for '{test_festival}': found {len(websites)} potential sites")

    # Test prompt creation
    prompt = create_festival_prompt("Test Festival", "Berlin, Germany")
    if "Test Festival" in prompt and "Berlin, Germany" in prompt:
        print("✅ Festival prompt creation works")
        return True
    else:
        print("❌ Festival prompt creation failed")
        return False


def test_festivals_file():
    """Test the festivals JSON file."""
    print("\n📄 Testing Festivals File...")

    if not os.path.exists(FESTIVALS_FILE):
        print(f"❌ Festivals file not found: {FESTIVALS_FILE}")
        return False

    try:
        with open(FESTIVALS_FILE, 'r', encoding='utf-8') as f:
            festivals = json.load(f)

        print(f"✅ Festivals file loaded: {len(festivals)} festivals")

        # Validate a few festivals
        validator = FestivalValidator()
        valid_count = 0

        test_count = min(5, len(festivals))
        for festival in festivals[:test_count]:  # Test first 5 or all if fewer
            name = festival.get('name', 'Unknown')
            is_valid = True

            # Check required fields
            required_fields = ['name', 'dates', 'location']
            for field in required_fields:
                if field not in festival:
                    print(f"❌ {name}: missing field '{field}'")
                    is_valid = False

            # Validate dates if present
            if 'dates' in festival and isinstance(festival['dates'], dict):
                start = festival['dates'].get('start')
                end = festival['dates'].get('end')
                if start and end:
                    if not validator.validate_festival_dates(start, end):
                        print(f"❌ {name}: invalid dates {start} to {end}")
                        is_valid = False

            # Validate location
            location = festival.get('location')
            if location and not validator.validate_location(location):
                print(f"❌ {name}: invalid location '{location}'")
                is_valid = False

            if is_valid:
                valid_count += 1
                print(f"✅ {name}: valid")

        print(f"✅ Validated {valid_count}/{test_count} festivals")
        return True

    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in festivals file: {e}")
        return False
    except Exception as e:
        print(f"❌ Error reading festivals file: {e}")
        return False


def test_updater_initialization():
    """Test FestivalUpdater initialization."""
    print("\n🚀 Testing Festival Updater Initialization...")

    try:
        updater = FestivalUpdater()
        print("✅ FestivalUpdater initialized successfully")
        return True
    except Exception as e:
        print(f"❌ FestivalUpdater initialization failed: {e}")
        return False


def run_diagnostics():
    """Run comprehensive system diagnostics."""
    print("🔍 Running Festival Updater System Diagnostics")
    print("=" * 60)

    tests = [
        ("Configuration", test_configuration),
        ("Festival Validator", test_festival_validator),
        ("Festival Search Engine", test_festival_search_engine),
        ("Festivals File", test_festivals_file),
        ("Updater Initialization", test_updater_initialization),
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results[test_name] = False

    print("\n" + "=" * 60)
    print("📊 Test Summary:")

    passed = 0
    total = len(tests)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
        if result:
            passed += 1

    print(f"\n🎯 Overall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All systems operational! Festival updater is ready to run.")
    else:
        print("⚠️  Some issues detected. Please resolve them before running the updater.")

    return passed == total


if __name__ == "__main__":
    success = run_diagnostics()
    sys.exit(0 if success else 1)
