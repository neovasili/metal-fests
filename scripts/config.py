# Festival Updater Configuration

# OpenAI Configuration
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_TEMPERATURE = 0.1
OPENAI_MAX_TOKENS = 1500

# Geocoding Configuration
GEOCODER_USER_AGENT = "metal-festivals-updater"
GEOCODER_TIMEOUT = 10

# Festival Search Configuration
MAX_NEW_FESTIVALS = 5
MIN_CONFIDENCE_THRESHOLD = "medium"

# Supported Countries (European countries)
EUROPEAN_COUNTRIES = [
    "Germany", "France", "United Kingdom", "UK", "Spain", "Italy", "Netherlands",
    "Belgium", "Austria", "Switzerland", "Sweden", "Norway", "Denmark", "Finland",
    "Poland", "Czech Republic", "Hungary", "Portugal", "Greece", "Ireland",
    "Croatia", "Slovenia", "Slovakia", "Estonia", "Latvia", "Lithuania",
    "Luxembourg", "Malta", "Cyprus", "Bulgaria", "Romania", "Serbia", "Bosnia",
    "Montenegro", "North Macedonia", "Albania", "Moldova", "Iceland"
]

# Festival Types/Keywords
METAL_FESTIVAL_KEYWORDS = [
    "metal", "rock", "heavy", "death", "black", "thrash", "doom", "power",
    "progressive", "symphonic", "folk", "viking", "pagan", "gothic", "industrial",
    "hardcore", "metalcore", "deathcore", "grindcore", "sludge", "stoner"
]

# Metal Genres for AI prompts
METAL_GENRES = [
    "Heavy Metal", "Thrash Metal", "Death Metal", "Black Metal", "Power Metal",
    "Progressive Metal", "Doom Metal", "Symphonic Metal", "Folk Metal",
    "Viking Metal", "Pagan Metal", "Gothic Metal", "Industrial Metal",
    "Metalcore", "Deathcore", "Hardcore", "Grindcore", "Sludge Metal",
    "Stoner Metal", "Post-Metal", "Atmospheric Metal"
]

# Festival search keywords for AI
FESTIVAL_KEYWORDS = [
    "festival", "fest", "open air", "metalfest", "rockfest", "days",
    "gathering", "celebration", "concert", "music festival", "summer festival",
    "winter festival", "metal festival", "rock festival"
]

# Minimum festival criteria
MIN_FESTIVAL_DURATION_DAYS = 1
MAX_FESTIVAL_DURATION_DAYS = 7
MIN_BANDS_FOR_NEW_FESTIVAL = 3

# Data sources to prioritize
RELIABLE_SOURCES = [
    "official festival website",
    "ticketmaster",
    "eventim",
    "songkick",
    "bandsintown",
    "metal-archives",
    "blabbermouth",
    "loudwire",
    "metal injection",
    "metal underground"
]
