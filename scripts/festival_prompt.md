Extract {{ FESTIVAL_NAME }} {{ FESTIVAL_LOCATION }} 2026 lineup from {{ FESTIVAL_URL }}
Wait until the page is fully loaded and all lineup bands are visible.

Return a compact JSON object: {"bands":[{"name":"Band","size":1}], "ticketPrice":123}

Rules:

- "size" is the visual tier of each band name shown on the lineup.
- Identify the distinct band name text-size tiers (1–3 groups usually).
- Smallest text = size 1, next = 2, largest = 3.
- If only one tier exists → all size 1.
- Do NOT invent more tiers than visually shown.
- ticketPrice must be a number (no currency) or null.
- If 2026 lineup is missing → {"bands":[],"ticketPrice":null}

Output must be the most compact possible JSON (no whitespace).

Do not reason outside the JSON schema. Do not analyze the website deeply.
Extract only the information required by the schema and nothing else.
