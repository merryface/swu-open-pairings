# SWU Open Pairings

A small browser-based pairing tool with saved match status, player filtering, and export support.

## Project structure

- `index.html` — Main web UI.
- `styles.css` — Visual styling.
- `app.js` — Browser bootstrap that initializes the UI.
- `src/pairings.js` — Pairing generation logic.
- `src/ui.js` — UI rendering, filtering, storage, and browser interaction.
- `src/pairings.test.js` / `app.test.js` — Test coverage for pairing logic and UI behavior.
- `index.js` — CLI runner for the pairing generator.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

## How to use

Open `index.html` in a browser. The app saves:

- player list
- chosen round count
- generated pairings
- played status for each match
- selected winner labels

A player filter dropdown appears above the pairings to show only the selected player's matches. Choose `All players` to reset the filter.

## Notes

This app works without a build step in the browser. In the browser, scripts are loaded from `src/` and bootstrapped by `app.js`.

## License

MIT
