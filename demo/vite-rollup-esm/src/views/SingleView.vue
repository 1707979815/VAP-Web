<script setup>
/**
 * 单例调试台：左「操作面板」(2 份) + 中「播放区」(2 份) + 右「事件日志」(1 份)。
 * 面板按「标签 | 控件」统一表格化排布，保证各行控件左边缘对齐、标签不换行。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { DEFAULT_PRESET, DEMO_IMAGE, PRESETS } from "../vap/assets.js";
import { playStateText, usePlayer } from "../composables/usePlayer.js";
import SlotPanel from "../components/SlotPanel.vue";
import EventLog from "../components/EventLog.vue";
import Dropdown from "../components/Dropdown.vue";

/** 播放状态枚举值（与 VapPlayState 对齐，模板里做判断用） */
const PLAYING = 3;
const PAUSED = 4;
const PAUSED_BY_INVISIBLE = 6;

const stageRef = ref(null);
const { state, log, ...p } = usePlayer();

const presets = PRESETS;
const presetKey = ref(DEFAULT_PRESET.file);
const useCustomUrl = ref(false);
const customUrl = ref("");

/** 运行期选项（默认 loop: 0 = 无限循环，演示更直观） */
const opts = reactive({
  loop: 0,
  muted: true,
  volume: 1,
  /** 0 表示跟随素材原始帧率 */
  fps: 0,
  endFrameMode: "Backward",
  isPreciseFrame: true,
  isClickable: true,
  dataPersistence: false,
  enableBlob: true,
  invisibleBehavior: "skip",
  fusionEdge: "linear",
  fusionAlphaBoost: 1,
  defaultPoster: "",
});

const showAdvanced = ref(false);
/** 加载完成后是否自动播放一次（demo 更直观，可在面板关闭） */
const autoPlay = ref(true);
const logFrames = ref(false);
const frameBusy = ref(false);
const dragging = ref(false);
const seekValue = ref(1);
const jumpValue = ref(1);
const rangeStart = ref(1);
const rangeEnd = ref(1);
const rangeLoop = ref(1);
const clickLog = ref([]);
const allClickEnabled = ref(true);
const skipped = ref(false);
const dpr = window.devicePixelRatio || 1;

/** 内置素材下拉选项 */
const presetOptions = computed(() =>
  presets.map((item) => ({ value: item.file, label: item.label, hint: item.note || "" })),
);

/** 结束帧模式选项 */
const endFrameOptions = [
  { value: "Backward", label: "Backward", hint: "停末帧" },
  { value: "Forward", label: "Forward", hint: "回首帧" },
  { value: "Clearward", label: "Clearward", hint: "清屏" },
];

/** 不可见行为选项 */
const invisibleOptions = [
  { value: "skip", label: "skip", hint: "跳渲染" },
  { value: "pause", label: "pause", hint: "暂停" },
];

/** 遮罩曲线选项 */
const fusionEdgeOptions = [
  { value: "linear", label: "linear", hint: "直乘遮罩（还原素材）" },
  { value: "smooth", label: "smooth", hint: "smoothstep 硬化边缘" },
];

/** 当前选中素材地址 */
const currentUrl = computed(() => {
  if (useCustomUrl.value) return customUrl.value.trim();
  const preset = presets.find((item) => item.file === presetKey.value);
  return preset ? preset.url : DEFAULT_PRESET.url;
});

/** 素材是否带融合层插槽（决定插槽配置区是否出现） */
const hasSlots = computed(
  () => !!(state.info && state.info.isVapx === 1 && state.srcList.length),
);

/** 状态徽标文案 */
const statusText = computed(() => (state.loading ? "加载中" : playStateText(state.playState)));

/** 状态徽标色调 */
const statusClass = computed(() => {
  if (state.error) return "badge-red";
  if (state.loading) return "badge-amber";
  if (state.playState === PLAYING) return "badge-green";
  if (state.playState === 2) return "badge-blue";
  return "badge-slate";
});

/** 总时长（秒） */
const duration = computed(() =>
  state.info && state.info.fps ? state.info.f / state.info.fps : 0,
);

/** 当前帧时间（秒） */
const currentTime = computed(() =>
  state.info && state.info.fps ? (state.currentFrame - 1) / state.info.fps : 0,
);

/** 组装传给实例的选项 */
function buildOptions() {
  const options = {
    loop: Number(opts.loop),
    muted: opts.muted,
    volume: Number(opts.volume),
    endFrameMode: opts.endFrameMode,
    isPreciseFrame: opts.isPreciseFrame,
    isClickable: opts.isClickable,
    dataPersistence: opts.dataPersistence,
    enableBlob: opts.enableBlob,
    invisibleBehavior: opts.invisibleBehavior,
    fusionEdge: opts.fusionEdge,
    fusionAlphaBoost: Number(opts.fusionAlphaBoost),
  };
  if (opts.fps > 0) options.fps = Number(opts.fps);
  if (opts.defaultPoster) options.defaultPoster = opts.defaultPoster;
  return options;
}

/** 素材就绪后复位帧控件 */
function resetFrameControls() {
  const total = state.totalFrames || 1;
  seekValue.value = 1;
  jumpValue.value = 1;
  rangeStart.value = 1;
  rangeEnd.value = total;
  clickLog.value = [];
}

/** 接线点击回调 */
function wireClicks() {
  p.registerAllClick((info) => {
    if (!allClickEnabled.value) return;
    clickLog.value.unshift({ tag: info.srcTag, frame: state.currentFrame });
    if (clickLog.value.length > 8) clickLog.value.pop();
    p.pushLog("click", `onAllClick · ${info.srcTag}`, "ok");
  });
  for (const slot of state.srcList) p.registerSlotClick(slot.srcTag, null);
}

/** 加载当前素材（可选自动播放一次） */
async function loadCurrent() {
  await p.load(currentUrl.value);
  resetFrameControls();
  if (autoPlay.value && state.totalFrames) {
    await p.play(Number(opts.loop));
  }
}

/** 重新加载当前素材 */
async function reload() {
  await loadCurrent();
}

/** 重建实例（选项变化较大时使用） */
async function recreate() {
  if (!stageRef.value) return;
  p.create(stageRef.value, buildOptions());
  wireClicks();
  await loadCurrent();
}

// ---- 选项热更新 ----
watch(
  () => [opts.fusionEdge, opts.fusionAlphaBoost],
  () =>
    p.setOptions({
      fusionEdge: opts.fusionEdge,
      fusionAlphaBoost: Number(opts.fusionAlphaBoost),
    }),
);
watch(
  () => [opts.muted, opts.volume],
  () => p.setOptions({ muted: opts.muted, volume: Number(opts.volume) }),
);
watch(
  () => [opts.loop, opts.endFrameMode, opts.fps],
  () => {
    const patch = { loop: Number(opts.loop), endFrameMode: opts.endFrameMode };
    if (opts.fps > 0) patch.fps = Number(opts.fps);
    p.setOptions(patch);
  },
);
watch(
  () => opts.isPreciseFrame,
  (value) => p.setOptions({ isPreciseFrame: value }),
);
watch(
  () => opts.isClickable,
  (value) => p.setClickable(value),
);
watch(
  () => opts.invisibleBehavior,
  (value) => p.setOptions({ invisibleBehavior: value }),
);
watch(
  () => opts.defaultPoster,
  (value) => p.setOptions({ defaultPoster: value }),
);
watch(
  () => state.currentFrame,
  (value) => {
    if (!dragging.value) seekValue.value = value;
  },
);
watch(
  () => state.totalFrames,
  (total) => {
    if (!total) return;
    rangeEnd.value = total;
    jumpValue.value = Math.min(jumpValue.value || 1, total);
  },
);
watch(logFrames, (value) => p.setLogFrames(value));

/**
 * 定格到指定帧
 * @param {number} frame 帧号（1 起）
 */
async function doSeek(frame) {
  if (!state.totalFrames || frameBusy.value) return;
  frameBusy.value = true;
  try {
    await p.seek(frame);
    seekValue.value = state.currentFrame;
    jumpValue.value = state.currentFrame;
  } catch (e) {
    p.pushLog("seek", (e && e.message) || String(e), "error");
  } finally {
    frameBusy.value = false;
  }
}

/** 滑块释放后跳帧 */
function onScrubEnd() {
  dragging.value = false;
  doSeek(seekValue.value);
}

/**
 * 逐帧步进
 * @param {number} delta 步进帧数
 */
async function step(delta) {
  if (!state.totalFrames) return;
  const target = Math.min(Math.max(1, (state.currentFrame || 1) + delta), state.totalFrames);
  seekValue.value = target;
  await doSeek(target);
}

/** 播放 / 暂停 / 继续 切换 */
async function togglePlay() {
  if (!state.totalFrames) return;
  if (state.playState === PLAYING) {
    p.pause();
  } else if (state.playState === PAUSED || state.playState === PAUSED_BY_INVISIBLE) {
    p.resume();
    if (state.playState !== PLAYING) await p.playFromCurrent(Number(opts.loop));
  } else {
    await p.playFromCurrent(Number(opts.loop));
  }
}

/** 区间播放 */
async function playRange() {
  if (!state.totalFrames) return;
  const start = Math.max(1, Math.min(Number(rangeStart.value), state.totalFrames));
  const end = Math.max(start + 1, Math.min(Number(rangeEnd.value), state.totalFrames));
  if (start >= end) {
    p.pushLog("playRange", "结束帧必须大于开始帧", "error");
    return;
  }
  await p.playRange(start, end, Number(rangeLoop.value));
}

/**
 * 选择本地文件：转 blob URL 播放
 * @param {Event} event change 事件
 */
function onPickFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  useCustomUrl.value = true;
  customUrl.value = URL.createObjectURL(file);
  p.pushLog("local", `本地文件 ${file.name}（${(file.size / 1024).toFixed(0)}KB）`, "ok");
  reload();
}

/**
 * 应用插槽图片
 * @param {string} tag 插槽 srcTag
 * @param {string} url 图片地址
 */
async function applyImage(tag, url) {
  const value = (url || "").trim();
  if (!value) {
    p.pushLog("setImage", "请先填写图片地址", "warn");
    return;
  }
  try {
    await p.setImage(tag, value);
  } catch (e) {
    p.pushLog("setImage", (e && e.message) || String(e), "error");
  }
}

/**
 * 用内置示例图填充插槽
 * @param {string} tag 插槽 srcTag
 */
function fillDemo(tag) {
  applyImage(tag, DEMO_IMAGE);
}

/**
 * 插槽点击回调开关
 * @param {string} tag 插槽 srcTag
 * @param {boolean} enabled 是否启用
 */
function toggleSlotClick(tag, enabled) {
  p.registerSlotClick(
    tag,
    enabled
      ? () => {
          p.pushLog("click", `插槽回调 ${tag}`, "ok");
          clickLog.value.unshift({ tag, frame: state.currentFrame });
          if (clickLog.value.length > 8) clickLog.value.pop();
        }
      : null,
  );
  p.pushLog("onClick", `${tag} ${enabled ? "已启用" : "已停用"}`, "info");
}

/**
 * 跳过渲染开关
 * @param {boolean} value 是否跳过
 */
function toggleSkip(value) {
  skipped.value = value;
  p.skipRender(value);
}

/**
 * 全局快捷键：空格播放/暂停，左右逐帧
 * @param {KeyboardEvent} event 键盘事件
 */
function onKeydown(event) {
  const tag = (event.target && event.target.tagName) || "";
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  // 下拉/按钮获得焦点时，空格与方向键留给控件自身
  if (event.target && event.target.closest && event.target.closest(".dd")) return;
  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  } else if (event.code === "ArrowLeft") {
    event.preventDefault();
    step(-1);
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    step(1);
  }
}

onMounted(async () => {
  window.addEventListener("keydown", onKeydown);
  if (!stageRef.value) return;
  p.create(stageRef.value, buildOptions());
  wireClicks();
  await loadCurrent();
});

onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="workspace">
    <!-- ① 操作面板（2 份宽） -->
    <aside class="panel panel-control">
      <!-- 素材 -->
      <section class="card">
        <header class="card-head">
          <h3>素材</h3>
          <span class="card-hint">内置 {{ presets.length }} 个 · 支持本地文件</span>
        </header>

        <div class="row">
          <label class="row-label">内置素材</label>
          <div class="row-ctl">
            <Dropdown
              v-model="presetKey"
              :options="presetOptions"
              :disabled="useCustomUrl"
              aria-label="内置素材"
              @change="reload"
            />
          </div>
        </div>

        <label class="row row-switch">
          <span class="row-label">自定义地址</span>
          <span class="row-ctl"><input v-model="useCustomUrl" class="toggle" type="checkbox" /></span>
        </label>

        <label class="row row-switch">
          <span class="row-label">加载后自动播放</span>
          <span class="row-ctl"><input v-model="autoPlay" class="toggle" type="checkbox" /></span>
        </label>

        <div v-if="useCustomUrl" class="row">
          <label class="row-label">地址</label>
          <div class="row-ctl">
            <input
              v-model="customUrl"
              class="input"
              type="text"
              placeholder="https://... 或 blob:..."
              @keyup.enter="reload"
            />
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" @click="reload">加载</button>
          <button class="btn" @click="recreate">重建实例</button>
          <label class="btn btn-ghost file-btn">
            本地文件
            <input type="file" accept="video/mp4,video/*" hidden @change="onPickFile" />
          </label>
        </div>
      </section>

      <!-- 播放控制 -->
      <section class="card">
        <header class="card-head">
          <h3>播放控制</h3>
          <span class="card-hint">loop / 结束帧 / 声音</span>
        </header>

        <div class="btn-row">
          <button class="btn btn-primary" :disabled="!state.totalFrames" @click="togglePlay">
            {{
              state.playState === PLAYING
                ? "暂停"
                : state.playState === PAUSED || state.playState === PAUSED_BY_INVISIBLE
                  ? "继续"
                  : "播放"
            }}
          </button>
          <button class="btn" :disabled="!state.totalFrames" @click="p.stop()">停止</button>
          <button class="btn" @click="p.destroy()">销毁</button>
        </div>

        <div class="row">
          <label class="row-label">循环次数</label>
          <div class="row-ctl">
            <input v-model.number="opts.loop" class="input" type="number" min="0" />
            <span class="row-note">0 = 无限</span>
          </div>
        </div>

        <div class="row">
          <label class="row-label">结束帧模式</label>
          <div class="row-ctl">
            <Dropdown v-model="opts.endFrameMode" :options="endFrameOptions" aria-label="结束帧模式" />
          </div>
        </div>

        <label class="row row-switch">
          <span class="row-label">静音</span>
          <span class="row-ctl"><input v-model="opts.muted" class="toggle" type="checkbox" /></span>
        </label>

        <div v-if="!opts.muted" class="row">
          <label class="row-label">音量</label>
          <div class="row-ctl">
            <input
              v-model.number="opts.volume"
              class="range"
              type="range"
              min="0"
              max="1"
              step="0.05"
            />
            <code class="row-value">{{ Number(opts.volume).toFixed(2) }}</code>
          </div>
        </div>

        <button class="btn btn-ghost btn-block" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? "收起高级选项" : "展开高级选项" }}
        </button>

        <div v-show="showAdvanced" class="advanced">
          <div class="row">
            <label class="row-label">帧率 fps</label>
            <div class="row-ctl">
              <input v-model.number="opts.fps" class="input" type="number" min="0" />
              <span class="row-note">0 = 跟随素材</span>
            </div>
          </div>

          <div class="row">
            <label class="row-label">不可见行为</label>
            <div class="row-ctl">
              <Dropdown v-model="opts.invisibleBehavior" :options="invisibleOptions" aria-label="不可见行为" />
            </div>
          </div>

          <label class="row row-switch">
            <span class="row-label">精确帧</span>
            <span class="row-ctl">
              <input v-model="opts.isPreciseFrame" class="toggle" type="checkbox" />
              <span class="row-note">rVFC 驱动</span>
            </span>
          </label>

          <label class="row row-switch">
            <span class="row-label">响应点击</span>
            <span class="row-ctl">
              <input v-model="opts.isClickable" class="toggle" type="checkbox" />
              <span class="row-note">isClickable</span>
            </span>
          </label>

          <label class="row row-switch">
            <span class="row-label">IndexedDB</span>
            <span class="row-ctl">
              <input v-model="opts.dataPersistence" class="toggle" type="checkbox" />
              <span class="row-note">解析结果缓存</span>
            </span>
          </label>

          <label class="row row-switch">
            <span class="row-label">Blob 播放</span>
            <span class="row-ctl">
              <input v-model="opts.enableBlob" class="toggle" type="checkbox" />
              <span class="row-note">整包下载</span>
            </span>
          </label>

          <label class="row row-switch">
            <span class="row-label">跳过渲染</span>
            <span class="row-ctl">
              <input :checked="skipped" class="toggle" type="checkbox" @change="toggleSkip($event.target.checked)" />
              <span class="row-note">性能排查</span>
            </span>
          </label>

          <div class="row">
            <label class="row-label">海报图</label>
            <div class="row-ctl">
              <input
                v-model="opts.defaultPoster"
                class="input"
                type="text"
                placeholder="留空不显示，https://.../poster.png"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- 帧控制 -->
      <section class="card">
        <header class="card-head">
          <h3>帧控制</h3>
          <span class="card-hint">拖动定格 · 支持区间播放</span>
        </header>

        <div class="frame-head">
          <code class="frame-now">{{ state.currentFrame }}</code>
          <span class="muted">/ {{ state.totalFrames || "-" }}</span>
          <span class="frame-time">{{ currentTime.toFixed(2) }}s</span>
        </div>

        <input
          v-model.number="seekValue"
          class="range"
          type="range"
          min="1"
          :max="state.totalFrames || 1"
          step="1"
          :disabled="!state.totalFrames || frameBusy"
          @input="dragging = true"
          @change="onScrubEnd"
        />

        <div class="btn-row btn-row-6">
          <button class="btn btn-xs" :disabled="!state.totalFrames" @click="step(-10)">-10</button>
          <button class="btn btn-xs" :disabled="!state.totalFrames" @click="step(-1)">-1</button>
          <button class="btn btn-xs" :disabled="!state.totalFrames" @click="doSeek(1)">首帧</button>
          <button class="btn btn-xs" :disabled="!state.totalFrames" @click="step(1)">+1</button>
          <button class="btn btn-xs" :disabled="!state.totalFrames" @click="step(10)">+10</button>
          <button class="btn btn-xs" :disabled="!state.totalFrames" @click="doSeek(state.totalFrames)">
            末帧
          </button>
        </div>

        <div class="row">
          <label class="row-label">跳到帧</label>
          <div class="row-ctl">
            <input
              v-model.number="jumpValue"
              class="input input-sm input-num"
              type="number"
              min="1"
              :max="state.totalFrames || 1"
            />
            <button class="btn btn-sm" :disabled="!state.totalFrames" @click="doSeek(jumpValue)">
              跳到该帧
            </button>
            <button
              class="btn btn-ghost btn-sm"
              :disabled="!state.totalFrames"
              @click="p.playFromCurrent(Number(opts.loop))"
            >
              从当前帧播放
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <label class="row-label">区间帧</label>
          <div class="row-ctl">
            <input v-model.number="rangeStart" class="input input-sm input-num" type="number" min="1" />
            <span class="row-sep">→</span>
            <input v-model.number="rangeEnd" class="input input-sm input-num" type="number" min="2" />
            <span class="row-note">起 / 止</span>
          </div>
        </div>

        <div class="row">
          <label class="row-label">区间循环</label>
          <div class="row-ctl">
            <input v-model.number="rangeLoop" class="input input-sm input-num" type="number" min="0" />
            <span class="row-note">0 = 无限</span>
            <button class="btn btn-primary btn-sm" :disabled="!state.totalFrames" @click="playRange">
              播放区间
            </button>
          </div>
        </div>
      </section>

      <!-- 插槽：有插槽才出现 -->
      <section v-if="hasSlots" class="card">
        <header class="card-head">
          <h3>插槽配置</h3>
          <span class="card-hint">setImage / setText / onClick</span>
        </header>

        <label class="row row-switch">
          <span class="row-label">命中记录</span>
          <span class="row-ctl">
            <input v-model="allClickEnabled" class="toggle" type="checkbox" />
            <span class="row-note">记录 onAllClick</span>
          </span>
        </label>

        <SlotPanel
          :slots="state.srcList"
          :clicks="clickLog"
          :clickable="opts.isClickable"
          @image="applyImage"
          @fill-demo="fillDemo"
          @text="p.setText"
          @toggle-click="toggleSlotClick"
          @clear-clicks="clickLog = []"
        />
      </section>

      <!-- 无插槽时的说明 -->
      <section v-else-if="state.info" class="card card-muted">
        <header class="card-head">
          <h3>插槽配置</h3>
          <span class="card-hint">当前素材无融合层</span>
        </header>
        <p class="muted">
          该素材是普通 VAP（无 VAPX 融合层），没有可配置的插槽。切换到带「VAPX 融合层」标记的素材试试。
        </p>
      </section>

      <!-- 融合层观感 -->
      <section v-if="hasSlots" class="card">
        <header class="card-head">
          <h3>融合层观感</h3>
          <span class="card-hint">遮罩曲线 / alpha 增益</span>
        </header>

        <div class="row">
          <label class="row-label">遮罩曲线</label>
          <div class="row-ctl">
            <Dropdown v-model="opts.fusionEdge" :options="fusionEdgeOptions" aria-label="遮罩曲线" />
          </div>
        </div>

        <div class="row">
          <label class="row-label">alpha 增益</label>
          <div class="row-ctl">
            <input
              v-model.number="opts.fusionAlphaBoost"
              class="range"
              type="range"
              min="0"
              max="3"
              step="0.05"
            />
            <code class="row-value">{{ Number(opts.fusionAlphaBoost).toFixed(2) }}</code>
          </div>
        </div>
      </section>
    </aside>

    <!-- ② 播放区（2 份宽） -->
    <section class="stage-col">
      <div class="stage-shell">
        <div ref="stageRef" class="stage"></div>
        <div v-if="!state.totalFrames" class="stage-empty">
          <span v-if="state.loading" class="spinner"></span>
          <template v-else>
            <strong>尚未加载素材</strong>
            <em>在左侧操作面板选择内置素材，或选择本地文件</em>
          </template>
        </div>
      </div>

      <div class="stage-meta">
        <span class="badge" :class="statusClass">{{ statusText }}</span>
        <span v-if="state.info" class="badge" :class="state.info.isVapx ? 'badge-purple' : 'badge-slate'">
          {{ state.info.isVapx ? "VAPX 融合层" : "普通 VAP" }}
        </span>
        <span v-if="state.info" class="meta-item">{{ state.info.w }}×{{ state.info.h }}</span>
        <span v-if="state.info" class="meta-item">{{ state.info.f }} 帧 · {{ state.info.fps }}fps</span>
        <span v-if="state.info" class="meta-item">时长 {{ duration.toFixed(2) }}s</span>
        <span class="meta-item">FPS {{ state.fps }}</span>
        <span class="meta-item">帧 {{ state.currentFrame }} / {{ state.totalFrames || "-" }}</span>
        <span class="meta-item">DPR {{ dpr }}</span>
        <span class="meta-item muted">空格 播放/暂停 · ←/→ 逐帧</span>
      </div>

      <div v-if="state.error" class="error-box">
        <div class="error-head">
          <span class="badge badge-red">{{ state.error.code }}</span>
          <strong>{{ state.error.tips || "加载失败" }}</strong>
        </div>
        <p class="error-msg">{{ state.error.message }}</p>
      </div>
    </section>

    <!-- ③ 事件日志（1 份宽） -->
    <aside class="panel panel-log">
      <section class="card card-log">
        <header class="card-head">
          <h3>事件日志</h3>
          <label class="switch switch-sm">
            <input v-model="logFrames" type="checkbox" />
            <span>帧事件</span>
          </label>
        </header>
        <EventLog :log="log" @clear="p.clearLog()" />
      </section>
    </aside>
  </div>
</template>
