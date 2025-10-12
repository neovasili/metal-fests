Use something like:

```markdown
Search the official page {{ FESTIVAL_URL }} for the {{ FESTIVAL_NAME }} {{ FESTIVAL_LOCATION }} (2026 edition).

Extract JSON only:
{"bands":["..."],"ticketPrice":"..."}
If 2026 data not found → {"bands":[],"ticketPrice":""}
