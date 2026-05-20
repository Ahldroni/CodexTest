# CodexTest

A static World of Warcraft Mythic+ dashboard for Ahldroni's Raider.IO characters.

## GitHub Pages

This project is designed to run as a static GitHub Pages site.

Live URL:

https://ahldroni.github.io/CodexTest/

## Features

- Multi-season Mythic+ dashboard
- Expansion-based season selector
- Character standings
- Dungeon coverage
- Best-run tracking
- Seasonal achievements
- Local static assets only

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- No backend
- No npm/build step
- GitHub Pages compatible

## Local Development

You can run the site locally with:

```bash
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## Data

Season data is stored inside:

```txt
/data
```

The app currently uses embedded JavaScript data objects for season snapshots.
