# custom-vap online demo

Source of the online demo: **https://1707979815.github.io/VAP-Web/**

- Vue 3 + Vite, using the published [`custom-vap`](https://www.npmjs.com/package/custom-vap) package from npm (the demo is built against the registry version, not local source).
- Two views: **单例调试台** (playback / frame range / VAPX slot image & text replacement / event log) and **多实例压测** (concurrent instances, aggregated FPS and worst frame gap).
- Deployed to GitHub Pages automatically by `.github/workflows/demo.yml` on every push to `main` that touches this directory.

## Run locally

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # vite build → dist/
```

Demo assets live in `public/assets` (three representative VAP/VAPX clips, kept small on purpose). To try your own animation, drop an `.mp4` into `public/assets` and add it to `src/vap/assets.js`.

> The demo needs a real HTTP origin (GitHub Pages or `npm run dev`); opening `dist/index.html` via `file://` will fail on module loading and video requests.
