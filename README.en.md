<div align="center">

# custom-vap

**A lightweight, WebGL-powered VAP / VAPX player for modern web — transparent video effects without re-encoding your assets.**

[简体中文](./README.md) | **English**

[![npm version](https://img.shields.io/npm/v/custom-vap.svg)](https://www.npmjs.com/package/custom-vap)
[![npm downloads](https://img.shields.io/npm/dm/custom-vap.svg)](https://www.npmjs.com/package/custom-vap)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/custom-vap.svg)](https://bundlephobia.com/package/custom-vap)
[![license](https://img.shields.io/npm/l/custom-vap.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/1707979815/VAP-Web?style=social&label=Star)](https://github.com/1707979815/VAP-Web)

```
RGB + Alpha compositing · VAPX slot replacement · rVFC precise frames · ~13KB gzip · zero UI framework deps
```

</div>

<!-- TODO: 录屏后替换为真实 GIF：![preview](./docs/preview.gif) -->
**[Live Demo](https://1707979815.github.io/VAP-Web/)** — single-instance playground (playback, frame range, VAPX image/text slots) and a multi-instance stress page.

---

## What it does

A VAP file is an ordinary `.mp4` carrying a JSON description box (`vapc`) plus two visual parts: the **RGB** area and the **Alpha** mask. `custom-vap` uploads both halves as WebGL textures and composites them per frame, so one video file plays as a transparent animation — no PNG sequence, no per-frame `drawImage`, no separate mask file to keep in sync.

| Capability | Detail |
| --- | --- |
| **Transparent video** | RGB / Alpha channels composited on the GPU, with premultiplied-alpha output. |
| **VAPX fusion layer** | Blend-layer slots support **runtime image and text replacement** — change a user's avatar or nickname without asking the designer for a new export. |
| **Slot click events** | `isClickable` + `onClick(tag, cb)` / `onAllClick(cb)` hit-testing inside the composited frame. |
| **Precise frame rendering** | Driven by `requestVideoFrameCallback` when available, with an automatic fallback to a per-instance `requestAnimationFrame` loop. |
| **Frame-range playback** | `playRange(startFrame, endFrame, loop)` and `seek(frame)` (freeze on an exact frame, 1-based). |
| **Data persistence** | Optional IndexedDB cache of the parsed VAP config; capacity trimming and expiry cleanup included. |
| **Viewport optimisation** | Shared `IntersectionObserver`: pause or skip rendering when off-screen. |
| **Structured errors** | Every failure is a `VAPError` with a stable `code`, a human-readable message and a `tips` hint. |
| **Multi-format build** | ESM / CJS / UMD entry points, full `.d.ts`, TypeScript-first. |

### Format support

- ✅ Tencent VAP / VAPX (`vapc` box containing plain JSON, `{ info, src, frame }`).
- ❌ YYEVA is **not** compatible: it stores a zlib+base64 compressed `mergeinfo` in the MP4 metadata with a different schema. Supporting it would require a separate adapter.

## Install

```bash
npm install custom-vap
# pnpm add custom-vap
# yarn add custom-vap
```

Or via CDN (exposes `window.CustomVap`):

```html
<script src="https://unpkg.com/custom-vap@latest/dist/index.umd.js"></script>
```

## Quick start (Vue 3)

```vue
<template>
  <div ref="stage" class="vap-stage"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { CustomVap } from 'custom-vap';

const stage = ref<HTMLDivElement>();
let player: CustomVap | null = null;

onMounted(async () => {
  if (!stage.value) return;
  player = new CustomVap(stage.value, { autoplay: true, loop: 0 });

  player.on('process', ({ frame }) => console.log('frame', frame));
  player.onEnd(() => console.log('finished'));

  await player.load('/assets/gift.mp4'); // a VAP/VAPX mp4
});

onBeforeUnmount(() => player?.destroy());
</script>

<style scoped>
.vap-stage {
  width: 300px;
  height: 300px;
}
</style>
```

Plain JavaScript works the same way:

```js
import { CustomVap } from 'custom-vap';

const player = new CustomVap(document.getElementById('stage'), { loop: 3 });
await player.load('/path/to/video.mp4');
player.play();
```

> **Passing your own `<canvas>`?** The library never touches its inline styles and never listens to its size — it only writes the drawing buffer from `clientWidth/clientHeight × DPR`. Give the canvas a CSS size and call `player.resize()` yourself when the parent changes. Passing a `div` lets the library manage the canvas for you.

## API at a glance

### Constructor

```ts
new CustomVap(el: HTMLDivElement | HTMLCanvasElement, options?: VapOptions)
```

### Options and defaults

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `loop` | `number` | `1` | Loop count; `0` or negative = infinite. |
| `autoplay` | `boolean` | `false` | Play as soon as loading finishes. |
| `muted` | `boolean` | `false` | Mute the audio track. |
| `volume` | `number` | `1.0` | Volume, `0`–`1`. |
| `fps` | `number` | video's own fps | Override the playback frame rate. |
| `endFrameMode` | `'Forward' \| 'Backward' \| 'Clearward'` | `'Backward'` | On end: stay on the last frame / return to the first / clear the canvas. |
| `dataPersistence` | `boolean` | `false` | Cache the parsed VAP config in IndexedDB. |
| `enableBlob` | `boolean` | `true` | Play through a Blob URL. |
| `isPreciseFrame` | `boolean` | `true` | Use rVFC; falls back to rAF automatically. |
| `isClickable` | `boolean` | `false` | Enable VAPX slot click events. |
| `invisibleBehavior` | `'pause' \| 'skip'` | `'skip'` | Off-screen: pause the timeline, or keep it running and skip painting. |
| `fusionEdge` | `'linear' \| 'smooth'` | `'linear'` | Mask curve for the fusion layer. `linear` multiplies the mask alpha as authored; `smooth` hardens it (useful for noisy alpha channels in heavily compressed mp4s). |
| `fusionAlphaBoost` | `number` | `1` | Alpha gain for the fusion layer. |

### Methods

`load(url)` · `play(loop?)` · `playRange(start, end, loop?)` · `seek(frame)` · `pause()` · `resume()` · `stop()` · `destroy()` · `resize()` · `setImage(tag, url)` · `setText(tag, text)` · `setDynamicResources(headData)` · `updateOptions(patch)` · `skipRender(skip?)` · `on(event, cb)` / `off(event, cb)` · `onLoad` / `onReady` / `onStart` / `onLoop` / `onPause` / `onResume` / `onStop` / `onEnd` / `onError` / `onVisible` / `onDestroy` · `onClick(tag, cb)` / `onAllClick(cb)`

Read-only: `currentFrame` (1-based, same convention as `playRange` / `seek`).

### Events

`load` · `ready` · `start` · `process` · `loop` · `pause` · `resume` · `stop` · `end` · `error` · `webglcontextlost` · `webglcontextrestored` · `visible` · `destroy`

Two ordering rules worth knowing:

- `stop` is emitted **synchronously**, and the freeze frame of `Backward` / `Forward` is painted later in `seeked`. Do not read pixels or take a screenshot inside the `stop` callback.
- A natural end is always `stop` → `end`, regardless of `endFrameMode`.

### Dynamic VAPX slots

```js
const player = new CustomVap(container, { isClickable: true });

player.onClick('avatar', () => console.log('avatar clicked'));
await player.setImage('avatar', 'https://example.com/avatar.png');
player.setText('nickname', 'VIP user');

// Batch form, with [tag] wildcard matching inside the resource list
await player.setDynamicResources({ nickname: 'DreamLife', avatar: '...' });
```

Slot tags come from the VAP file's own `src` list — run the demo, open the slot panel, and copy the tag names you see there.

### Errors

```ts
import { isVAPError } from 'custom-vap';

player.onError(({ error, code, tips }) => {
  if (!isVAPError(error)) return;
  if (code === 'NETWORK') return retryLater();
  report(code, tips);
});
```

The `error` payload is always `{ error, code, message, tips }`: `error` is the `VAPError` instance, `code` is a stable identifier, and `tips` is a ready-to-display hint (Chinese copy). Codes include `NETWORK`, `PARSE_FAILED`, `NOT_LOADED`, `INVALID_FRAME_RANGE`, `VIDEO_ERROR`, `AUTOPLAY_BLOCKED`, `WEBGL_UNSUPPORTED`, `WEBGL_CONTEXT_LOST`, `POSTER_LOAD_FAILED`, `DYNAMIC_RESOURCE_FAILED`, `CACHE_FAILED` and `UNSUPPORTED_ELEMENT`.

## This repository

This is the **showcase repository**: it contains the README and the demo site only. The player itself ships as a compiled npm package, so there is no `src/` here — the demo consumes `custom-vap` from the registry, which doubles as the reference implementation.

- Package: <https://www.npmjs.com/package/custom-vap>
- Live demo: <https://1707979815.github.io/VAP-Web/>
- Issues & feature requests: <https://github.com/1707979815/VAP-Web/issues>

## License

MIT © [DreamLife(Zhou)](https://github.com/1707979815)

**If this project helps you, a [Star](https://github.com/1707979815/VAP-Web) ⭐ is appreciated!**
