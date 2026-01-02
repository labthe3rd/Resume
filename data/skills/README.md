# Skills Management

## Adding New Skill Category

1. Create a new JSON file in `/data/skills/` (e.g., `category-name.json`)
2. Use the template:

```json
{
  "title": "Skill Category Title",
  "icon": "Code2",
  "color": "#00d4ff",
  "skills": [
    "Skill 1",
    "Skill 2",
    "Skill 3"
  ]
}
```

## Available Icons

- Code2
- Network
- Cpu
- Shield
- Bot
- Eye
- Zap
- Wrench
- Castle
- Clock
- DollarSign

## Field Descriptions

- **title**: Category name (Required)
- **icon**: Icon name from available icons (Required)
- **color**: Hex color code for accents (Required)
- **skills**: Array of skill names (Required)

## Removing Skill Category

Delete the JSON file from `/data/skills/`

## Notes

- Categories display in file name order
- First category gets "large" styling in bento grid
- Changes require server restart in development
- In production (Vercel), changes take effect on next deployment
