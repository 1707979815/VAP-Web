/**
 * @file assets.js
 * @description 内置演示素材清单。全部为本地文件，离线可用。
 * `kind` 仅用于界面标注：VAPX 表示带融合层插槽（可在「插槽」面板配置）。
 */

/**
 * 素材放在 `public/assets`，由 Vite 原样拷贝：
 * 开发与构建后都通过 BASE_URL 取绝对路径，避免 `new URL(..., import.meta.url)` 在打包后被改写丢路径。
 */
const ASSET_DIR = `${import.meta.env.BASE_URL}assets/`;

/**
 * 拼出素材地址
 * @param {string} file 文件名
 * @returns {string}
 */
function asset(file) {
  return `${ASSET_DIR}${file}`;
}

/**
 * 预设素材。
 * 展示仓只保留 3 个有代表性的样本（融合层两档帧率 + 普通 VAP），
 * 控制仓库体积；更多素材请参见素材提供方或自行替换 `public/assets`。
 */
export const PRESETS = [
  { file: "vap0.mp4", label: "vap0 · VAPX 融合层", kind: "VAPX", note: "192 帧 / 24fps" },
  { file: "vap2.mp4", label: "vap2 · VAPX 融合层", kind: "VAPX", note: "90 帧 / 10fps" },
  { file: "head-en(2).mp4", label: "head-en(2) · 普通 VAP", kind: "VAP", note: "100 帧 / 25fps" },
].map((item) => ({ ...item, url: asset(item.file) }));

/** 插槽演示图（也给「海报」用） */
export const DEMO_IMAGE = asset("4-ride.png");

/** 默认选中的素材 */
export const DEFAULT_PRESET = PRESETS[0];
