# custom-vap online demo

Source of the online demo: **https://1707979815.github.io/VAP-Web/**

- Vue 3 + Vite. The player comes from the published [`custom-vap`](https://www.npmjs.com/package/custom-vap) package — the demo is built against the packaged artifact, never against local source.
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

## Dependency source

`package.json` currently points `custom-vap` at a tarball in `vendor/`:

```json
"custom-vap": "file:./vendor/custom-vap-1.1.1.tgz"
```

This is a deliberate temporary measure: the demo uses APIs that only exist in the packaged `1.1.1` build (`seek`, `VAPError` / `isVAPError`, `fusionEdge`), while the npm registry still serves `1.1.0`. Committing the tarball keeps CI and local installs reproducible without depending on an unpublished version.

**After `custom-vap@1.1.1` is published**, switch back to the registry and delete `vendor/`:

```bash
# in this directory
npm pkg set dependencies.custom-vap='^1.1.1'
rm -rf vendor
rm -rf node_modules package-lock.json
npm install
```

Keeping the tarball in sync by hand is the one maintenance cost of this arrangement — prefer the registry dependency whenever the published version satisfies the demo.
