# Downtime Tracker — GitHub Pages Package

This folder contains a GitHub Pages–ready copy of your HTML app, plus a PWA manifest and service worker so it can be installed and work offline.

## Files
- `index.html` — your app (copied from the original upload)
- `manifest.webmanifest` — PWA manifest (uses relative paths to work under project pages like `/repo-name/`)
- `service-worker.js` — caches core assets for offline use
- `icons/` — PWA icons and `apple-touch-icon.png`
- `favicon.ico`
- `404.html` — project-pages friendly 404
- `.nojekyll` — ensures Pages doesn't process files
- `README.md` — this guide

## Deploy on GitHub Pages
1. Create a new public repo (e.g., `downtime-tracker`).
2. Upload all files at the repo root (keep the `icons/` folder).
3. Commit to the `main` branch.
4. In **Settings → Pages**: set **Source** to "Deploy from a branch", **Branch** to `main`, **Folder** `/ (root)`, then **Save**.
5. After it builds, your site will be live at `https://<user>.github.io/<repo>/`.

## Update to a new version
- Replace `index.html` (and any assets) and **bump the `VERSION` constant** at the top of `service-worker.js` (e.g., `v1` → `v2`), then commit. This forces browsers to pick up the new cache.
- If testing and a change doesn’t appear, do a hard refresh or clear the service worker in DevTools → Application → Service Workers → "Unregister" + "Clear storage".

## Local testing
Run a local server (service workers require HTTPS or localhost):
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
