# Changelog

记录 custom-vap 的版本变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

日期以 npm 实际发布时间为准。1.0.0 ~ 1.0.2 为初始发布阶段；旧实现（离屏渲染 / 早期 `CustomVapPlayState` 命名）已归档到 `versions/alpha/` 与 `versions/v1/`，API 与当前版本不同，**勿当现状参考**。

## [Unreleased]（1.1.1）

> 当前工作区已完成、但**尚未发布到 npm** 的实现。发布时把本节标题改为 `[1.1.1] - YYYY-MM-DD`。

### Added

- **结构化错误体系**：新增 `VAPError`（`Error` 子类，带稳定的 `code`）、`isVAPError`（类型守卫）与 `VAPErrorCode` 类型；错误码 → 中文提示的 `VAP_ERROR_TIPS` 是码表的唯一来源。`error` 事件载荷统一为 `{ error, code, message, tips }`，旧的 `({ message })` 解构写法继续可用。
- **定格跳帧 `seek(frame)`**：暂停并精确定格到指定帧（帧号 1 起），与 `playRange` 共用同一套帧号口径；定格后 `playState` 为 `PAUSED`。
- **融合层遮罩可配置**：新增 `fusionEdge`（`linear` 默认 / `smooth`）与 `fusionAlphaBoost`（默认 `1`），可按素材调整融合层边缘硬度与 alpha 增益。
- **事件总线 `eventBus.ts`**：`on/off` 为多监听（同一事件可并存多个回调），`onXxx` 为单监听槽位（重复调用替换并返回取消函数）；单个监听回调抛错只打日志，不打断渲染循环。
- **`LICENSE` 与 npm 元数据**：补 MIT 许可证文件，补全 `repository` / `homepage` / `bugs` / `author.url`，`keywords` 换成场景长尾词。

### Changed

- **预乘 alpha 管线**：主视频、融合层、海报三处 shader 统一输出 `vec4(rgb * a, a)`，修复半透明边缘发白/发光。
- **融合层默认观感**：遮罩默认直乘（`fusionEdge: 'linear'` + `fusionAlphaBoost: 1`），与素材设计稿及官方 VAP 一致。旧版固定 `smoothstep(0.01, 0.95) × 1.8`，会把 0.5 的遮罩抬到约 0.93；需要旧观感请显式传 `{ fusionEdge: 'smooth', fusionAlphaBoost: 1.8 }`。**这是可见的观感变化**。
- **帧与区间状态收敛**：新增 `timeline.ts`（`PlaybackTimeline` + `frameToTime` / `findClosestFrame`），统一帧号换算（对外 1 起、内部 0 起）、区间回卷与 loop 去重。
- `updateOptions` 支持动态刷新 / 移除 `defaultPoster`：仅在海报可见阶段（`IDLE` / `LOADING` / `READY`、或 `STOPPED` + `Clearward`）立即重绘，播放中只更新底图。

### Fixed

- 停止落帧与 `seek` 收敛为同一例程（`stopAtFrame` → `seekAndDraw`），不再把停机逻辑挂在 `seeked` 回调里，避免视频未就绪时残留 rAF / rVFC 空转。

## [1.1.0] - 2026-09-04

### Added

- 新增 `ready` / `loop` / `destroy` 事件：`ready` 在视频可播放时触发，`loop` 在每轮回卷回到起点时触发（`loopCount` 自 2 起），`destroy` 在资源释放前触发。
- 新增便捷单监听方法：`onLoad` / `onReady` / `onStart` / `onLoop` / `onPause` / `onResume` / `onStop` / `onEnd` / `onError` / `onVisible` / `onDestroy`，返回取消函数。

### Changed

- 新增共享帧调度开关并**默认关闭**：默认每个实例独立 rAF / rVFC，避免多实例串行渲染互相阻塞。
- 压测页支持切换实例数与精确帧模式，新增「最长帧间隔」统计，用于观察多实例下的单帧抖动。

### Fixed

- 修复默认底图（海报）渲染出现异常白色区域的问题。

## [1.0.5] - 2026-08-13

### Added

- `VapOptions.defaultPoster`：默认海报图，用于未播放、`Clearward` 清屏与加载失败时的兜底画面。
- 新增 `demo/vite-rollup-esm` 回归 demo：单例调试台（播放 / 帧控制 / 插槽）+ 多实例压测页。
- 新增 tsup 构建（`build:tsup`），与 rollup 产物对齐。
- 新增 `shapedTicker`：rAF 不可用时的帧调度降级方案。

### Changed

- 架构梳理：`vap.ts` / `indexDB.ts` / `observer.ts` / `utils.ts` / `webgl.ts` 整体重构，`events` 与资源释放路径收敛。
- **公开枚举 `CustomVapPlayState` 更名为 `VapPlayState`**（旧名别名已移除，属不兼容变更）。
- `VideoEvent` 精简为 `load` / `start` / `pause` / `end` / `error` / `seeked`。
- 移除无实际用途的 `VAPSrc.fitType`、`VAPSrc.loadType`、`VAPFrameObj.mt`。
- 旧实现归档到 `versions/alpha/`、`versions/v1/`（只读）。

## [1.0.4] - 2026-07-31

### Fixed

- 修正包元数据：`description` 补齐，`keywords` 清理从 custom-svga 残留的 `svga` 相关词。仅元数据变更，运行时行为与 1.0.3 一致。

## [1.0.3] - 2026-07-31

### Added

- 新增使用文档 `USE.md`。

## [1.0.1] / [1.0.2] - 2026-07-30

- 首次发布：基于 WebGL 的视频动效播放器，随包提供 ESM / CJS / UMD 多产物。
- 1.0.2 为发布当日的修正版本。
