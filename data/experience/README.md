# Experience Management

## Adding New Experience

1. Create a new JSON file in `/data/experience/` (e.g., `company-name.json`)
2. Use the template:

```json
{
  "company": "Company Name",
  "role": "Job Title",
  "period": "Start - End",
  "location": "City, State",
  "description": "Brief description",
  "highlights": [
    "Highlight 1",
    "Highlight 2"
  ],
  "color": "#00d4ff"
}
```

## Field Descriptions

- **company**: Company or organization name (Required)
- **role**: Job title/position (Required)
- **period**: Employment period (e.g., "Dec 2023 - Present") (Required)
- **location**: Work location (Required)
- **description**: Brief role description (Required)
- **highlights**: Array of key achievements/responsibilities (Required)
- **color**: Hex color code for timeline dot and accents (Required)

## Removing Experience

Delete the JSON file from `/data/experience/`

## Notes

- Experiences display in file name order
- Changes require server restart in development
- In production (Vercel), changes take effect on next deployment
