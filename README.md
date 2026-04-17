# Daily Routine Tracker

A small phone-friendly routine tracker built with plain HTML, CSS, and JavaScript.

## Open It

1. Open [index.html](C:\Users\zimmw\Documents\Codex\2026-04-17-build-me-a-simple-web-based\index.html) in a browser on your computer to test it locally.
2. To use the PWA features on your iPhone, host this folder over `https://` with a static host like GitHub Pages, Netlify, or Cloudflare Pages.
3. On iPhone, open the hosted URL in Safari, tap `Share`, then choose `Add to Home Screen`.

## Publish To GitHub Pages

1. Create a new GitHub repository and upload the contents of this folder.
2. Make sure the default branch is named `main`.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `GitHub Actions`.
5. Push to `main` and wait for the `Deploy static site to Pages` workflow to finish.
6. Open the Pages URL GitHub gives you, then install it from Safari on your iPhone.

This project already includes:

- `.github/workflows/pages.yml` to deploy the site automatically
- `.nojekyll` so GitHub Pages serves the static files directly

## What It Does

- Shows your tasks for the current day
- Saves tasks and checkmarks in browser storage
- Lets you add routine items with optional times
- Tracks whether each item is done today
- Shows a simple streak count for consecutive days
- Includes a web app manifest and offline cache so it behaves like a lightweight home-screen app

## Notes

- Data is stored in the browser using `localStorage`, so each browser keeps its own copy.
- Service workers do not run from `file://` links, so offline installable behavior needs a normal hosted URL over `https://` or `http://localhost` for testing.
- iPhone home-screen install works best from Safari.
