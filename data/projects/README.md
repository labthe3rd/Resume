# Project Management

## Adding a New Project

1. Create a new JSON file in `/data/projects/` with any filename (e.g., `my-new-project.json`)
2. Use the following template:

```json
{
  "title": "Project Title",
  "company": "Company Name",
  "category": "Category Name",
  "icon": "IconName",
  "color": "#hexcolor",
  "problem": "Description of the problem",
  "solution": "Description of the solution",
  "benefit": "Description of the benefit/outcome",
  "monetaryValue": "150,000",
  "monetaryWord": "Savings",
  "tags": ["Tag1", "Tag2", "Tag3"]
}
```

## Available Icons

- Clock
- DollarSign
- Shield
- Cpu
- Bot
- Wrench
- Zap
- Eye
- Castle

## Field Descriptions

- **title**: Project name
- **company**: Company or client name
- **category**: Category for filtering (will auto-populate in filter buttons)
- **icon**: Icon name from available icons list
- **color**: Hex color code (e.g., "#00d4ff")
- **problem**: Problem statement
- **solution**: Solution description
- **benefit**: Benefit/outcome
- **monetaryValue**: Optional - Monetary value (e.g., "150,000" or "350,000/hr")
- **monetaryWord**: Optional - Word to display with value (e.g., "Savings", "Impact", "Value")
- **tags**: Array of technology/skill tags

## Removing a Project

Simply delete the JSON file from `/data/projects/`

## Notes

- Categories are automatically generated from the JSON files
- Projects are displayed in alphabetical order by filename
- Changes require a server restart in development mode
- In production (Vercel), changes will take effect on the next deployment
