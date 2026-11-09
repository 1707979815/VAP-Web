<div align="center">

# 🎬 Custom VAP

**A lightweight, WebGL-powered video animation player (VAP) for Vue 3 & modern web.**

支持视频 Alpha 通道实时合成 · VAPX 融合层动态图片/文本替换 · 精确帧渲染 · TypeScript 全量类型

**简体中文** | [English](./README.en.md)

[![npm version](https://img.shields.io/npm/v/custom-vap.svg)](https://www.npmjs.com/package/custom-vap)
[![npm downloads](https://img.shields.io/npm/dm/custom-vap.svg)](https://www.npmjs.com/package/custom-vap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/custom-vap)](https://bundlephobia.com/package/custom-vap)
[![license](https://img.shields.io/npm/l/custom-vap.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![GitHub stars](https://img.shields.io/github/stars/1707979815/VAP-Web?style=flat-square&label=Stars)](https://github.com/1707979815/VAP-Web)

<br>

# ⭐ 给个 Star 支持一下

**如果这个项目对你有帮助，请点击右上角的 ⭐ Star 按钮，你的支持是我持续维护的动力！**

[![Star this repo](https://img.shields.io/badge/%E2%AD%90%20Star%20-%20custom--vap%20on%20GitHub-blue?style=for-the-badge&logo=github)](https://github.com/1707979815/VAP-Web)

**[🔗 在线演示 Live Demo](https://1707979815.github.io/VAP-Web/)** — 单实例动效、多实例压测、VAPX 融合层图片/文本替换

</div>

---

## ✨ Features

| 特性 | 说明 |
| --- | --- |
| 🎞️ **视频 Alpha 合成** | 基于 WebGL 将 MP4 视频的 RGB 通道与 Alpha 通道实时合成，实现透明动效 |
| 🧩 **VAPX 融合层** | 支持在视频上叠加图片 / 文本插槽（slot），实现动态内容替换 |
| 🎯 **精确帧渲染** | 支持 `requestVideoFrameCallback`（rVFC）精准同步视频帧渲染，兼容环境自动回退 RAF |
| 🖼️ **运行时图片替换** | 不重编 VAP 即可替换融合层图片图层（支持 URL 动态加载） |
| 📝 **动态文本注入** | 在动画播放中实时替换文本图层 |
| 👆 **插槽点击事件** | 支持指定插槽 / 全局插槽的点击回调 |
| 💾 **数据持久化** | 基于 IndexedDB 缓存 VAP 解析结果，减少重复网络请求 |
| 👀 **可见性监听** | 多实例共享 IntersectionObserver，支持移出视口时暂停 / 跳过渲染 |
| 🎬 **帧范围播放** | 支持播放任意帧区间并自定义循环次数 |
| 🌐 **多产物输出** | ESM / CJS / UMD 全场景覆盖（npm、script 标签、CDN） |
| 🎯 **TypeScript 一等公民** | 完整 `.d.ts` 类型定义，IDE 智能提示开箱即用 |

---

## 📥 Installation

```bash
# npm
npm install custom-vap

# yarn
yarn add custom-vap

# pnpm
pnpm add custom-vap
```

### 浏览器 CDN（无构建工具）

```html
<!-- unpkg -->
<script src="https://unpkg.com/custom-vap@latest/dist/index.umd.js"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/custom-vap@latest/dist/index.umd.js"></script>

<script>
  const vap = new CustomVap(document.getElementById('stage'), { autoplay: true });
  vap.load('/path/to/video.mp4');
</script>
```

---

## 🚀 Quick Start

### Vue 3 组件用法

```vue
<template>
  <div ref="container" class="vap-stage"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { CustomVap } from 'custom-vap';

const container = ref<HTMLDivElement>();
let player: CustomVap | null = null;

onMounted(async () => {
  if (!container.value) return;

  player = new CustomVap(container.value, {
    autoplay: true,   // 加载后自动播放
    loop: 0,          // 无限循环
  });

  // 方式一：on(key, cb)，支持同事件多监听
  player.on('start', () => console.log('播放开始'));
  player.on('process', ({ frame }) => console.log('当前帧:', frame));
  player.on('end', () => console.log('播放结束'));

  // 方式二：onLoad / onReady / onStart / onPause / onResume / onLoop /
  // onStop / onEnd / onError / onVisible / onDestroy 单监听（process 与
  // webglcontext* 不提供），重复调用自动替换旧回调，返回取消函数便于清理
  const offEnd = player.onEnd(({ frame }) => console.log('播放结束于第', frame, '帧'));

  await player.load('/path/to/video.mp4');
});

onBeforeUnmount(() => {
  player?.destroy();
});
</script>

<style scoped>
.vap-stage {
  width: 300px;
  height: 300px;
}
</style>
```

### 原生 JavaScript 用法

```javascript
import { CustomVap } from 'custom-vap';

const player = new CustomVap(document.getElementById('stage'), {
  loop: 3,
});

await player.load('/path/to/video.mp4');
player.play();
```

### 传入 Canvas 元素

```javascript
import { CustomVap } from 'custom-vap';

// 直接传入已有 canvas 元素
const player = new CustomVap(canvasEl, { loop: 0 });
await player.load('/path/to/video.mp4');
player.play();
```

> **画布显示尺寸由你的 CSS 决定**：直传 canvas 时库**完全不碰样式**，只按画布的布局尺寸（`clientWidth/Height`）× DPR 设置绘制缓冲，也不做等比缩放（等比留白交给 `aspect-ratio` / `object-fit`）。
>
> 同时，直传 canvas 时库**不监听**该画布的尺寸变化（被观察元素就是画布本身，写 `canvas.width` 会反过来触发尺寸回调，形成互相驱动）。容器或父级尺寸变了，需要你自行调用 `player.resize()`。
>
> 请务必用 CSS 给画布一个确定的显示尺寸；没有 CSS 尺寸时画布的布局尺寸由 `width/height` 属性决定，HiDPI 屏上会因"属性像素 × DPR → 布局变大"而逐次放大。

```css
/* 推荐：容器定比例，画布铺满，库只负责渲染分辨率 */
.stage { width: 100%; aspect-ratio: 16 / 9; }
.stage > canvas { width: 100%; height: 100%; display: block; }
```

```javascript
// 父级尺寸变化后手动重算（库不会自动跟随）
window.addEventListener('resize', () => player.resize());
```

---

## 📚 API 文档

### `new CustomVap(el, options?)`

创建播放器实例。传入 `div` 时内部自动创建 `canvas`，传入 `canvas` 时直接使用该画布。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| el | `HTMLDivElement \| HTMLCanvasElement` | ✅ | 挂载容器节点或 Canvas 元素 |
| options | `VapOptions` | ❌ | 初始化配置 |

#### VapOptions 配置项

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `loop` | `number` | `1` | 循环次数（`0` 或负数 = 无限循环） |
| `autoplay` | `boolean` | `false` | 加载后自动播放 |
| `muted` | `boolean` | `false` | 是否静音 |
| `volume` | `number` | `1.0` | 音量（0~1） |
| `fps` | `number` | - | 目标帧率，默认使用视频原始帧率 |
| `endFrameMode` | `'Forward' \| 'Backward' \| 'Clearward'` | `'Backward'` | 播放结束行为：`Backward` 停在尾帧、`Forward` 回到首帧、`Clearward` 清空画布 |
| `dataPersistence` | `boolean` | `false` | 是否开启 IndexedDB 数据持久化缓存 |
| `enableBlob` | `boolean` | `true` | 是否将视频转为 Blob URL 播放 |
| `isPreciseFrame` | `boolean` | `true` | 是否使用 rVFC 精确帧渲染（不支持时自动回退独立 RAF） |
| `isClickable` | `boolean` | `false` | 是否启用 VAPX 融合层插槽点击事件 |
| `invisibleBehavior` | `'pause' \| 'skip'` | `'skip'` | 移出视口时的行为：`pause` 自动暂停、`skip` 跳过渲染保持播放 |
| `defaultPoster` | `string` | - | 默认海报图地址：未播放 / `Clearward` 清屏 / 加载失败时显示 |
| `fusionEdge` | `'linear' \| 'smooth'` | `'linear'` | 融合层遮罩曲线：`linear` 直乘遮罩 alpha（还原素材设计）；`smooth` 走 `smoothstep` 硬化边缘，可压制 mp4 遮罩通道压缩噪点 |
| `fusionAlphaBoost` | `number` | `1` | 融合层遮罩 alpha 增益；`>1` 更实，仅特殊观感需求时调 |

> **融合层观感的默认值变更**：`1.1.0` 及更早版本的遮罩曲线固定为 `smoothstep(0.01, 0.95)` 再乘 `1.8`，会把 0.5 的遮罩抬到约 0.93。现在默认改为直乘（`fusionEdge: 'linear'` + `fusionAlphaBoost: 1`），与素材设计稿 / 官方 VAP 一致，但**融合层看起来会比旧版本淡一些**。要还原旧观感，显式传 `{ fusionEdge: 'smooth', fusionAlphaBoost: 1.8 }`。

#### CustomVap 实例方法

| 方法 | 说明 |
| --- | --- |
| `load(url)` | 加载并解析 VAP 视频，返回 `Promise<this>` |
| `play(loop?)` | 播放动效，`loop` 可覆盖配置项，返回 `Promise<this>` |
| `playRange(startFrame, endFrame, loop?)` | 播放指定帧范围，返回 `Promise<this>` |
| `seek(frame)` | 定格到指定帧（帧号 1 起）；播放中调用会先暂停，定格后 `playState` 为 `PAUSED`，返回 `Promise<this>`；等待 `seeked` 期间若被 `stop()` / `load()` / `destroy()` / 新的 `seek()` 打断，Promise 会立即结束（不会悬挂），定格结果以打断操作为准 |
| `pause()` | 暂停播放 |
| `resume()` | 恢复播放 |
| `stop()` | 停止播放，按 `endFrameMode` 决定结束帧表现；已处于停止状态时幂等（不重复发 `stop`），`stop` 事件同步发出，Backward/Forward 的定格帧在其后的 `seeked` 才绘制 |
| `destroy()` | 彻底销毁实例，释放视频 / WebGL / 事件等资源 |
| `resize()` | 手动重新计算画布物理尺寸（跟随容器布局尺寸与 DPR）；div 模式同步内联 CSS 尺寸，canvas 直传只写绘制缓冲、不碰样式（直传时也不会自动监听尺寸变化） |
| `setImage(tag, url)` | 通过 URL 设置融合层图片资源，返回 `Promise<this>` |
| `setText(tag, text)` | 设置融合层文本资源 |
| `setDynamicResources(headData)` | 批量设置动态资源，支持 `[tag]` 通配匹配，返回 `Promise<this>` |
| `updateOptions(newOptions)` | 动态合并更新配置；`defaultPoster` 变更会同步刷新/清除海报，`fusionEdge`/`fusionAlphaBoost` 变更会立即重绘当前帧 |
| `skipRender(skip?)` | 暂停 / 恢复绘制，帧同步继续推进（切 tab、被弹窗遮挡时用）；不传参时切换当前状态 |
| `on(event, callback)` | 监听事件（多监听并存），返回 `this` |
| `off(event, callback)` | 移除事件监听，返回 `this` |
| `onLoad(callback)` | 便捷单监听 `load`（重复调用自动替换），返回取消函数 |
| `onReady(callback)` | 便捷单监听 `ready`（重复调用自动替换），返回取消函数 |
| `onStart(callback)` | 便捷单监听 `start`（重复调用自动替换），返回取消函数 |
| `onLoop(callback)` | 便捷单监听 `loop`（重复调用自动替换），返回取消函数 |
| `onPause(callback)` | 便捷单监听 `pause`（重复调用自动替换），返回取消函数 |
| `onResume(callback)` | 便捷单监听 `resume`（重复调用自动替换），返回取消函数 |
| `onStop(callback)` | 便捷单监听 `stop`（重复调用自动替换），返回取消函数 |
| `onEnd(callback)` | 便捷单监听 `end`（重复调用自动替换），返回取消函数 |
| `onError(callback)` | 便捷单监听 `error`（重复调用自动替换），返回取消函数 |
| `onVisible(callback)` | 便捷单监听 `visible`（重复调用自动替换），返回取消函数 |
| `onDestroy(callback)` | 便捷单监听 `destroy`（重复调用自动替换），返回取消函数 |
| `onClick(srcTag, callback)` | 注册指定插槽的点击事件 |
| `onAllClick(callback)` | 注册所有插槽通用的点击事件 |

> 只读属性：`currentFrame` —— 当前帧号（1 起，与 `playRange` / `seek` 的帧号口径一致）。

#### CustomVap 事件回调

| 事件 | 载荷 | 触发时机 |
| --- | --- | --- |
| `load` | `{ url, config }` | 视频加载解析完成 |
| `ready` | `{ currentTime }` | 视频已就绪可播放（`<video>` canplaythrough） |
| `start` | `{ currentTime }` | 播放开始 |
| `process` | `{ frame, currentTime }` | 每渲染一帧触发 |
| `loop` | `{ currentTime, loopCount }` | 每轮循环回到起点重新播放（`loopCount` 为当前开始的第几遍，自 2 起） |
| `pause` | `{ currentTime }` | 播放暂停 |
| `resume` | `{ currentTime }` | 播放恢复 |
| `stop` | `{ currentTime }` | 播放停止（**同步**发出；`currentTime` 为落帧 seek 之前的值，Backward/Forward 的定格画面晚于该事件绘制，此刻截图/读像素拿不到最终画面） |
| `end` | `{ currentTime, frame }` | 播放结束（恒在 `stop` 之后触发） |
| `error` | `{ error, code, message, tips }` | 加载 / 播放出错，`error` 为结构化 `VAPError` |
| `webglcontextlost` | `{ message }` | WebGL 上下文丢失 |
| `webglcontextrestored` | `{ message }` | WebGL 上下文恢复 |
| `visible` | `{ isVisible, playState }` | 容器可见性变化 |
| `destroy` | `{ currentTime, playState }` | 实例销毁前触发（资源尚未释放） |

---

## 🎯 高级用法

### 1. 帧范围播放

```javascript
// 只播放第 10~50 帧，循环 3 次
await player.playRange(10, 50, 3);
```

### 2. 动态替换图片图层

```javascript
// 替换融合层指定插槽的图片
await player.setImage('avatar', 'https://example.com/new-avatar.png');
```

### 3. 动态注入文本

```javascript
// 简单文本替换：第一个参数是插槽 tag，第二个是文本内容
player.setText('username', 'VIP 用户');
```

### 4. 批量设置动态资源

```javascript
// 支持 [tag] 通配：资源里的 [username] 会匹配 headData 中的 username
await player.setDynamicResources({
  username: 'DreamLife',
  avatar: 'https://example.com/avatar.png',
});
```

### 5. 融合层插槽点击事件

```javascript
const player = new CustomVap(container, { isClickable: true });

// 指定插槽点击
player.onClick('avatar', () => console.log('点击了 avatar 插槽'));

// 全局插槽点击（可拿到 srcId / srcTag / 点击区域坐标）
player.onAllClick(({ srcId, srcTag, frame }) => {
  console.log('点击插槽:', srcId, srcTag, frame);
});
```

### 6. 可见性优化

```javascript
const player = new CustomVap(container, {
  invisibleBehavior: 'pause', // 移出视口时自动暂停，回到视口自动恢复
  // invisibleBehavior: 'skip', // 移出视口时跳过渲染但保持帧同步（默认）
});
```

### 7. 结束帧模式

```javascript
const player = new CustomVap(container, {
  endFrameMode: 'Forward',   // 结束回到第一帧
  // endFrameMode: 'Backward',  // 结束停在最后一帧（默认）
  // endFrameMode: 'Clearward', // 结束清空画布
});
```

> **事件时序**：`stop` 事件同步发出，`Backward` / `Forward` 的定格帧是在其后的 `seeked` 里绘制的（`Clearward` 则为清屏 + 海报）。因此**不要在 `stop` 回调里截图或读像素**——此时画面还是停止前的残帧，甚至已被清空；需要最终定格画面时，请等 `stop` 之后约一帧（或自行监听一次绘制完成）再取。

### 8. 动态更新配置

```javascript
player.updateOptions({ muted: true, loop: 0 });
```

### 9. 错误处理与错误码

所有加载 / 播放 / 渲染失败都会抛出或回调一个 `VAPError`（`Error` 子类），带稳定 `code`，业务侧不必再靠 message 字符串匹配：

| 字段 | 说明 |
| --- | --- |
| `code` | 稳定错误码（见下表） |
| `message` | 排查细节，自动带 `[VAP error] ` 前缀（含 URL / HTTP 状态码等变量信息） |
| `tips` | 可直接展示给用户的中文提示（稳定文案，含建议动作） |
| `cause` | 原始异常（如有），用于排查根因 |

| Code | 触发时机 | 典型处理 |
| --- | --- | --- |
| `NETWORK` | fetch 抛错或 HTTP 非 2xx | 检查网络后重试 |
| `PARSE_FAILED` | 找不到 `vapc` box、JSON 损坏、配置为空 | 素材无效，换素材 |
| `NOT_LOADED` | 未 `load()` 就调用 `play()` / `resume()` | 调用顺序问题 |
| `INVALID_FRAME_RANGE` | `playRange` 结束帧 ≤ 开始帧 | 修正入参 |
| `VIDEO_ERROR` | `<video>` 网络层 / 解码层失败 | 换素材 |
| `AUTOPLAY_BLOCKED` | 带声播放被浏览器策略拦截（含静音重试失败） | 引导用户手势，或初始化时 `muted: true` |
| `WEBGL_UNSUPPORTED` | 拿不到 WebGL 上下文 | 降级为静态图 |
| `WEBGL_CONTEXT_LOST` | 上下文丢失（同时发 `webglcontextlost`） | 等待 `webglcontextrestored` |
| `POSTER_LOAD_FAILED` | `defaultPoster` 加载失败 | 检查图片地址 |
| `DYNAMIC_RESOURCE_FAILED` | `setImage` 插槽图片加载失败 | 检查资源地址 |
| `CACHE_FAILED` | IndexedDB 缓存写入失败（不影响播放） | 可忽略 |
| `UNSUPPORTED_ELEMENT` | 构造参数既不是 div 也不是 canvas | 修正入参 |

```javascript
import { isVAPError } from 'custom-vap';

// 方式一：事件（payload 已展开 code/message/tips，可直接解构）
player.on('error', ({ code, message, tips, error }) => {
  if (code === 'NETWORK') return retryLater();
  if (code === 'AUTOPLAY_BLOCKED') return showTapToPlay();
  showToast(tips);              // tips 是可直接展示的文案
  report(code, message, error.cause);
});

// 方式二：Promise 拒绝值同样是 VAPError
try {
  await player.load(url);
} catch (err) {
  if (isVAPError(err) && err.code === 'PARSE_FAILED') markBrokenAsset(url);
}
```

> `error` 事件的 payload 仍是 `{ error, message }` 的超集：旧代码 `player.on('error', ({ message }) => ...)` 无需改动。

---

## 📊 特性一览

| 场景 | 说明 |
| --- | --- |
| 精确帧 | 支持 rVFC 的浏览器自动使用精准帧驱动，否则回退每个实例独立的 RAF |
| 数据持久化 | 开启后解析结果自动写入 IndexedDB，二次加载秒开 |
| 上下文丢失 | 自动监听 WebGL 上下文丢失 / 恢复，并重建着色器与纹理 |
| 多实例共享 | 可见性观察器为多实例共享，节省开销；渲染循环各实例独立互不抢占 |
| 自动播放拦截 | 浏览器拦截自动播放时，自动降级为静音播放 |
| 结构化错误 | 所有失败统一为带 `code` / `tips` / `cause` 的 `VAPError`，便于打点、重试与降级 |

---

## 🌐 浏览器兼容性

| 特性 | 最低支持 |
| --- | --- |
| WebGL 渲染 | 所有支持 WebGL 1.0+ 的现代浏览器 |
| rVFC 精确帧 | Chrome / Edge 87+，不支持时自动回退 RAF |
| IntersectionObserver 可见性监听 | Chrome / Edge 51+，Firefox 55+，Safari 12.1+ |
| IndexedDB 持久化 | 所有现代浏览器（不支持时自动跳过） |

---

## 🔧 常见问题

<details>
<summary><b>Q: 视频加载后没有画面？</b></summary>

- 请确认容器具有非零宽高，且容器尺寸在 `load` 时已就绪
- 播放器会在 `load` / `play` / WebGL 上下文恢复时执行 `resize()`，并在 div 模式下监听容器尺寸变化自动重算
- 直传 `<canvas>` 时库不监听尺寸变化、也不改你的样式：父级尺寸变了请自行调用 `player.resize()`（`transform: scale` 不属于尺寸变化，不会重算）

</details>

<details>
<summary><b>Q: 浏览器自动播放被拦截？</b></summary>

播放器内置自动播放降级策略：当浏览器阻止有声自动播放时，会自动切换为静音模式重试。也可在初始化时直接设置 `muted: true`。

```javascript
const player = new CustomVap(container, { autoplay: true, muted: true });
```

</details>

<details>
<summary><b>Q: 如何只播放某一帧区间？</b></summary>

```javascript
// 播放第 1~30 帧，循环 2 次
await player.playRange(1, 30, 2);
```

</details>

<details>
<summary><b>Q: WebGL 上下文丢失后如何恢复？</b></summary>

无需手动处理。播放器已监听 `webglcontextlost` / `webglcontextrestored` 事件，恢复后自动重建着色器程序、缓冲与纹理，并触发对应事件通知。

</details>

<details>
<summary><b>Q: 移出视口想暂停播放怎么配置？</b></summary>

```javascript
const player = new CustomVap(container, {
  invisibleBehavior: 'pause', // 移出视口自动暂停，回到视口自动恢复
});
```

</details>

## 🤝 贡献

欢迎 PR 和 Issue！请确保：
- 代码风格一致（TypeScript strict）
- 提交前 `npm run build:rollup` 能成功
- 重大变更请先开 Issue 讨论

## 📄 License

MIT © 2026 [DreamLife(Zhou)](https://github.com/1707979815)

## 📦 关于本仓库

- 本仓库是 **展示仓**：`demo/vite-rollup-esm` 即线上演示站点的源码（GitHub Pages 自动部署），**不含播放器源码**。
- 播放器以编译后的 npm 包产物分发，demo 依赖的正是这份产物（当前固定在 `demo/vite-rollup-esm/vendor/` 的 tarball；registry 上发布对应版本后切回 `^x.y.z`），同时也是接入参考实现。
- 遇到问题或想要新能力，请到 [Issues](https://github.com/1707979815/VAP-Web/issues) 反馈；迁移、素材兼容等问题附上最小复现会快很多。

## 🙏 致谢

- [VAP](https://github.com/Tencent/vap) - 腾讯视频云动画播放方案（VAP/VAPX）

---

<div align="center">

**⭐ 喜欢这个项目？在 [GitHub](https://github.com/1707979815/VAP-Web) 上给我们一个 Star 吧！你的支持就是最大的动力！**

[![GitHub stars](https://img.shields.io/github/stars/1707979815/VAP-Web?style=for-the-badge&logo=github&label=Stars&color=ffdd00)](https://github.com/1707979815/VAP-Web)

</div>
