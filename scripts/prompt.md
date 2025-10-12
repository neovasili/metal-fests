Given the url {{ FESTIVAL_URL }} of the {{ FESTIVAL_NAME }} in {{ FESTIVAL_LOCATION }}, give me the following information:

- List of band names in the festival line-up
- Basic ticket price

You might need to scan images in the website to find the band names.

Return only a JSON object like this:

```json
{
  "bands": ["List", "of", "band", "names"],
  "ticketPrice": "Basic ticket price in euros (number only)"
}
```

Return only the completed JSON object without any additional explanation or commentary.
