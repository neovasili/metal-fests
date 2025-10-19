#!/usr/bin/env python3
"""
Data validation script for db.json

Performs comprehensive validation checks on the database including:
- JSON validity
- Capitalization patterns for band names, genres, and roles
- Duplicate detection using Levenshtein distance
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple


# ANSI color codes for terminal output
class Colors:
    """ANSI color codes for colorized terminal output"""

    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"


def colorize(text: str, color: str) -> str:
    """Colorize text with ANSI codes"""
    return f"{color}{text}{Colors.END}"


def print_header(text: str):
    """Print a colorized header"""
    print(f"\n{colorize('═' * 80, Colors.BOLD)}")
    print(colorize(f"  {text}", Colors.BOLD + Colors.CYAN))
    print(f"{colorize('═' * 80, Colors.BOLD)}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{colorize('✓', Colors.GREEN)} {text}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{colorize('⚠', Colors.YELLOW)} {colorize(text, Colors.YELLOW)}")


def print_error(text: str):
    """Print error message"""
    print(f"{colorize('✗', Colors.RED)} {colorize(text, Colors.RED)}")


def print_info(text: str):
    """Print info message"""
    print(f"{colorize('ℹ', Colors.BLUE)} {text}")


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate the Levenshtein distance between two strings.

    Args:
        s1: First string
        s2: Second string

    Returns:
        The Levenshtein distance (number of single-character edits needed)
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            # Cost of insertions, deletions, or substitutions
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def is_capitalized_per_word(text: str, allow_exceptions: bool = True) -> bool:
    """
    Check if text follows capitalized per word pattern.

    Args:
        text: The text to check
        allow_exceptions: Allow common exceptions like 'of', 'the', 'and', 'in', 'a', etc.

    Returns:
        True if the text follows the pattern, False otherwise
    """
    # Common exceptions that can be lowercase in titles
    exceptions = {
        "of",
        "the",
        "and",
        "in",
        "a",
        "an",
        "or",
        "but",
        "for",
        "at",
        "by",
        "to",
        "from",
        "with",
    }

    words = text.split()
    if not words:
        return False

    for i, word in enumerate(words):
        # Skip empty words
        if not word:
            continue

        # Skip words that are all special characters or numbers
        if word.isdigit():
            continue

        # Check if word is an exception (but not the first word)
        if allow_exceptions and i > 0 and word.lower() in exceptions:
            if word.islower():
                continue

        # For non-exception words, check if first letter is capitalized
        first_letter_idx = next((j for j, c in enumerate(word) if c.isalpha()), None)
        if first_letter_idx is not None:
            if not word[first_letter_idx].isupper():
                return False

    return True


def is_role_capitalized(role: str) -> bool:
    """
    Check if band member role has first word capitalized.

    Args:
        role: The role text to check

    Returns:
        True if properly capitalized, False otherwise
    """
    if not role:
        return False

    # Get first word
    first_word = role.split()[0] if role.split() else role

    # Find first letter
    first_letter_idx = next((i for i, c in enumerate(first_word) if c.isalpha()), None)
    if first_letter_idx is None:
        return True  # No letters, skip validation

    return first_word[first_letter_idx].isupper()


def validate_json_structure(file_path: Path) -> Tuple[bool, Dict]:
    """
    Validate that the file is valid JSON and load it.

    Args:
        file_path: Path to the JSON file

    Returns:
        Tuple of (success, data or None)
    """
    print_header("JSON STRUCTURE VALIDATION")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print_success(f"Valid JSON structure")
        return True, data
    except json.JSONDecodeError as e:
        print_error(f"Invalid JSON: {e}")
        return False, {}
    except FileNotFoundError:
        print_error(f"File not found: {file_path}")
        return False, {}
    except Exception as e:
        print_error(f"Error reading file: {e}")
        return False, {}


def validate_band_names(data: Dict) -> Tuple[int, int]:
    """
    Validate band names in both festivals and bands sections.

    Args:
        data: The loaded JSON data

    Returns:
        Tuple of (errors, warnings)
    """
    print_header("BAND NAME CAPITALIZATION")

    errors = 0
    warnings = 0

    # Check band names in festivals
    print_info("Checking band names in festivals...")
    for festival in data.get("festivals", []):
        festival_name = festival.get("name", "Unknown")
        for band_name in festival.get("bands", []):
            if not is_capitalized_per_word(band_name, allow_exceptions=True):
                print_error(
                    f"  Festival '{festival_name}': Band name '{band_name}' not properly capitalized"
                )
                errors += 1

    if errors == 0:
        print_success(
            f"All {sum(len(f.get('bands', [])) for f in data.get('festivals', []))} band names in festivals are properly capitalized"
        )

    # Check band names in bands section
    print_info("Checking band names in bands section...")
    bands_errors = 0
    for band in data.get("bands", []):
        band_name = band.get("name", "")
        if not is_capitalized_per_word(band_name, allow_exceptions=True):
            print_error(f"  Band '{band_name}' not properly capitalized")
            bands_errors += 1
            errors += 1

    if bands_errors == 0:
        print_success(
            f"All {len(data.get('bands', []))} band names are properly capitalized"
        )

    return errors, warnings


def validate_genres(data: Dict) -> Tuple[int, int]:
    """
    Validate music genre capitalization.

    Args:
        data: The loaded JSON data

    Returns:
        Tuple of (errors, warnings)
    """
    print_header("MUSIC GENRE CAPITALIZATION")

    errors = 0
    warnings = 0

    for band in data.get("bands", []):
        band_name = band.get("name", "Unknown")
        for genre in band.get("genres", []):
            if not is_capitalized_per_word(genre, allow_exceptions=False):
                print_error(
                    f"  Band '{band_name}': Genre '{genre}' not properly capitalized"
                )
                errors += 1

    if errors == 0:
        total_genres = sum(
            len(band.get("genres", [])) for band in data.get("bands", [])
        )
        print_success(f"All {total_genres} genre entries are properly capitalized")

    return errors, warnings


def validate_member_roles(data: Dict) -> Tuple[int, int]:
    """
    Validate band member role capitalization.

    Args:
        data: The loaded JSON data

    Returns:
        Tuple of (errors, warnings)
    """
    print_header("BAND MEMBER ROLE CAPITALIZATION")

    errors = 0
    warnings = 0

    for band in data.get("bands", []):
        band_name = band.get("name", "Unknown")
        for member in band.get("members", []):
            member_name = member.get("name", "Unknown")
            role = member.get("role", "")

            if not is_role_capitalized(role):
                print_error(
                    f"  Band '{band_name}', Member '{member_name}': Role '{role}' first word not capitalized"
                )
                errors += 1

    if errors == 0:
        total_members = sum(
            len(band.get("members", [])) for band in data.get("bands", [])
        )
        print_success(f"All {total_members} member roles are properly capitalized")

    return errors, warnings


def detect_duplicates(data: Dict, threshold: int = 2) -> Tuple[int, int]:
    """
    Detect potential duplicate band names using Levenshtein distance.

    Args:
        data: The loaded JSON data
        threshold: Maximum Levenshtein distance to consider as potential duplicate

    Returns:
        Tuple of (errors, warnings)
    """
    print_header("DUPLICATE DETECTION (Levenshtein Distance)")

    errors = 0
    warnings = 0

    # Collect all band names from both sections
    all_bands: List[Tuple[str, str]] = []  # (name, source)

    # From festivals
    for festival in data.get("festivals", []):
        festival_name = festival.get("name", "Unknown")
        for band_name in festival.get("bands", []):
            all_bands.append((band_name, f"Festival: {festival_name}"))

    # From bands section
    for band in data.get("bands", []):
        band_name = band.get("name", "")
        all_bands.append((band_name, "Bands section"))

    # Check for duplicates
    print_info(
        f"Checking {len(all_bands)} band entries for potential duplicates (threshold: {threshold})..."
    )

    checked_pairs: Set[Tuple[str, str]] = set()
    duplicates_found = 0

    for i, (name1, source1) in enumerate(all_bands):
        for j, (name2, source2) in enumerate(all_bands):
            if i >= j:
                continue

            # Normalize for comparison
            normalized_pair = tuple(sorted([name1.lower(), name2.lower()]))
            if normalized_pair in checked_pairs:
                continue

            checked_pairs.add(normalized_pair)

            # Skip if exactly the same (legitimate duplicates across festivals)
            if name1 == name2:
                continue

            distance = levenshtein_distance(name1.lower(), name2.lower())

            if distance <= threshold:
                print_warning(
                    f"  Potential duplicate (distance={distance}): '{name1}' ({source1}) ↔ '{name2}' ({source2})"
                )
                warnings += 1
                duplicates_found += 1

    if duplicates_found == 0:
        print_success("No potential duplicates detected")
    else:
        print_info(f"Found {duplicates_found} potential duplicate(s)")

    return errors, warnings


def main():
    """Main validation function"""
    print(
        colorize("\n🎸 Metal Festivals Database Validator", Colors.BOLD + Colors.CYAN)
    )
    print(colorize("=" * 80, Colors.BOLD))

    # Determine file path
    db_path = Path(__file__).parent.parent / "db.json"

    # Validate JSON structure
    success, data = validate_json_structure(db_path)
    if not success:
        print_error("\n❌ Validation failed: Invalid JSON structure")
        sys.exit(1)

    # Print data summary
    festivals_count = len(data.get("festivals", []))
    bands_count = len(data.get("bands", []))
    print_info(f"Loaded {festivals_count} festivals and {bands_count} bands")

    # Run all validation checks
    total_errors = 0
    total_warnings = 0

    errors, warnings = validate_band_names(data)
    total_errors += errors
    total_warnings += warnings

    errors, warnings = validate_genres(data)
    total_errors += errors
    total_warnings += warnings

    errors, warnings = validate_member_roles(data)
    total_errors += errors
    total_warnings += warnings

    errors, warnings = detect_duplicates(data, threshold=2)
    total_errors += errors
    total_warnings += warnings

    # Print summary
    print_header("VALIDATION SUMMARY")

    if total_errors == 0 and total_warnings == 0:
        print(
            colorize(
                "✅ All validations passed! No issues found.",
                Colors.BOLD + Colors.GREEN,
            )
        )
        sys.exit(0)
    else:
        if total_errors > 0:
            print(
                colorize(f"❌ Found {total_errors} error(s)", Colors.BOLD + Colors.RED)
            )
        if total_warnings > 0:
            print(
                colorize(
                    f"⚠️  Found {total_warnings} warning(s)", Colors.BOLD + Colors.YELLOW
                )
            )

        if total_errors > 0:
            sys.exit(1)
        else:
            sys.exit(0)


if __name__ == "__main__":
    main()
