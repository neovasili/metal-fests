# Festival Updater Automation System

This directory contains the automated festival information updater system that uses AI to maintain and expand the metal festivals database.

## Overview

The system automatically:

- Updates existing festival information
- Discovers new European metal festivals
- Validates all festival data
- Creates pull requests with changes
- Runs on a weekly schedule via GitHub Actions

## Components

### Core Scripts

- **`festival_updater.py`** - Main automation script with OpenAI integration
- **`festival_utils.py`** - Utility functions for validation and web searching
- **`config.py`** - Configuration constants and settings
- **`test_system.py`** - Comprehensive testing and diagnostics

### Configuration Files

- **`requirements.txt`** - Python dependencies
- **`.env`** - Environment variables (not tracked in git)

### GitHub Workflow

- **`../.github/workflows/festival-updater.yml`** - Automated CI/CD workflow

## Setup

### Environment Variables

Create a `.env` file in the scripts directory:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here

# Optional: Customize behavior
MAX_FESTIVALS_TO_UPDATE=10
MAX_NEW_FESTIVALS_TO_ADD=5
```

### Install Dependencies

```bash
cd scripts
pip install -r requirements.txt
```

### Test the System

Run the diagnostic script to ensure everything is configured correctly:

```bash
python test_system.py
```

## Usage

### Manual Execution

Update existing festivals:

```bash
python festival_updater.py --mode update
```

Discover new festivals:

```bash
python festival_updater.py --mode discover
```

Both operations:

```bash
python festival_updater.py --mode both
```

Dry run (no changes made):

```bash
python festival_updater.py --mode both --dry-run
```

### Automated Execution

The system runs automatically via GitHub Actions:

- **Schedule**: Every Sunday at 02:00 UTC
- **Trigger**: Manual workflow dispatch
- **Mode**: Both update and discover

## How It Works

### Festival Information Gathering

The system uses OpenAI GPT-4o-mini to:

- Research official festival websites
- Verify information from multiple sources
- Extract structured data (dates, lineup, prices)
- Validate against European metal festival criteria

### Data Validation

Multi-layered validation ensures quality:

- **Date Logic**: Proper chronological order, reasonable duration
- **Location Format**: "City, Country" with European country validation
- **URL Validation**: Proper format and accessibility
- **Price Validation**: Numeric values in reasonable ranges
- **Band Names**: Cleaning and deduplication

### Change Management

Intelligent change detection:

- Compares new data against existing entries
- Identifies meaningful updates (not just formatting changes)
- Preserves manual edits and additions
- Maintains data source attribution

### Pull Request Generation

Automated PR creation with:

- Detailed change summaries
- Data source citations
- Validation results
- Rollback instructions

## Configuration

### European Countries

The system focuses on festivals in these European countries (configurable in `config.py`):

- Western Europe: Germany, France, UK, Netherlands, Belgium, etc.
- Northern Europe: Sweden, Norway, Finland, Denmark
- Southern Europe: Spain, Italy, Greece, Portugal
- Central/Eastern Europe: Poland, Czech Republic, Austria, etc.

### Metal Genres

Targeted music genres:

- Heavy Metal, Thrash Metal, Death Metal
- Black Metal, Power Metal, Progressive Metal
- Metalcore, Symphonic Metal, Folk Metal
- And other metal subgenres

### Festival Criteria

Festivals must meet these criteria:

- Located in Europe
- Primarily metal/rock music
- Multi-day or significant single-day events
- Annual recurring festivals
- Professional organization (not local club shows)

## Data Sources

The AI searches across:

- Official festival websites
- Major ticketing platforms (Ticketmaster, Eventim)
- Music news sites (Blabbermouth, Loudwire)
- Social media and official announcements
- Venue and tourism websites

## Quality Assurance

### Confidence Levels

- **High**: Official sources (festival websites, major ticketing platforms)
- **Medium**: Established music press and news sites
- **Low**: Social media, forums, unverified sources

### Validation Rules

- All dates must be in YYYY-MM-DD format
- Festival duration limited to 7 days maximum
- Ticket prices must be numeric and reasonable (€10-€500)
- Locations must follow "City, Country" format
- URLs must be valid and accessible

### Error Handling

- Graceful degradation when APIs are unavailable
- Retry logic for temporary failures
- Detailed logging for debugging
- Rollback capabilities for problematic updates

## Monitoring

### Logs

The system generates detailed logs:

- Festival research and validation results
- API response times and error rates
- Change detection and reasoning
- Pull request creation status

### Notifications

GitHub Actions provides:

- Workflow success/failure notifications
- Pull request creation alerts
- Error summaries and debugging information

## Troubleshooting

### Common Issues

1. **API Rate Limits**: OpenAI API has usage limits
   - Solution: Implement backoff and retry logic
   - Monitor usage in OpenAI dashboard

2. **Invalid Festival Data**: AI sometimes returns incomplete information
   - Solution: Enhanced validation and retry with different prompts
   - Manual review of low-confidence results

3. **GitHub Authentication**: Token permissions or expiration
   - Solution: Regenerate token with proper repository permissions
   - Ensure token has workflow and pull request permissions

### Debugging

Run the test script for system diagnostics:

```bash
python test_system.py
```

Enable debug logging:

```bash
python festival_updater.py --mode both --debug
```

## Maintenance

### Regular Tasks

- Monitor OpenAI API usage and costs
- Review and merge generated pull requests
- Update festival criteria and validation rules
- Expand country and venue coverage

### Seasonal Updates

- Update target years (currently focused on 2026)
- Adjust festival discovery keywords
- Review and update data source priorities

## Contributing

### Adding New Features

1. Extend `festival_utils.py` for new validation rules
2. Update `config.py` for new countries or criteria
3. Modify `festival_updater.py` for new AI prompts or logic
4. Add tests to `test_system.py`

### Improving AI Prompts

The prompts in `festival_utils.py` can be enhanced for:

- Better data accuracy
- More comprehensive source coverage
- Improved handling of edge cases

## Security

- API keys stored as GitHub Secrets
- No sensitive data in repository
- Rate limiting to prevent abuse
- Validation to prevent malicious data injection

## Performance

- Concurrent processing for multiple festivals
- Caching of API responses
- Efficient change detection algorithms
- Minimal GitHub API usage

---

For support or questions, check the main repository issues or create a new issue with the "automation" label.
