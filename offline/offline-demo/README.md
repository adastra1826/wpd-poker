# Poker Table Offline Demo

This is an offline demo of the poker table interface for development and testing purposes.

## How to Use

1. Open `index.html` in your web browser
2. The poker table should display with sample player data
3. Note: This demo requires an internet connection for:
   - Bootstrap CSS/JS (from CDN)
   - Font Awesome icons (from CDN)

## Files

- `index.html` - Main HTML file with the poker table structure
- `poker_screen.css` - Styles for the poker table and players
- `game_screen.css` - Styles for playing cards
- `poker_settings.css` - Styles for poker settings modal
- `main.css` - General site styles
- `WPD.css` - Site-specific styles

## Notes

- Player avatars and some images may not load (they're from the live site)
- The table background uses a local image: `../i/poker_tables/dbz.webp`
- This is a static demo - buttons won't function without JavaScript
- For a fully offline version, you'd need to download Bootstrap and Font Awesome locally

## Troubleshooting

If the table doesn't display:
1. Check browser console for errors
2. Ensure all CSS files are in the same directory
3. Verify the poker table image exists at `../i/poker_tables/dbz.webp`
4. Make sure you have an internet connection (for CDN resources)

