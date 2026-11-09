<script setup>
/**
 * 多实例压测：并发创建 N 个播放器，实时统计总帧率、每实例最差帧率与最长单帧间隔，
 * 用于复现「多实例互相抢渲染」这类问题。
 */
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { CustomVap, VapPlayState } from "../vap/engine.js";
import { DEFAULT_PRESET, PRESETS } from "../vap/assets.js";
import Dropdown from "../components/Dropdown.vue";

/** 实例数量上限（再多浏览器 WebGL 上下文容易告警） */
const MAX_INSTANCES = 8;

const presetKey = ref(DEFAULT_PRESET.file);
const count = ref(4);
const precise = ref(true);
const loop = ref(0);
const running = ref(false);

const stats = reactive({ totalFps: 0, avgFps: 0, minFps: 0, maxGap: 0, frames: 0 });

/** @type {import("vue").Ref<Array<{id:number, el:HTMLElement|null, player:any, frames:number, fps:number, gap:number}>>} */
const items = ref([]);
let timer = null;

/** 素材下拉选项 */
const presetOptions = PRESETS.map((item) => ({
  value: item.file,
  label: item.label,
  hint: item.note || "",
}));

/** 当前素材地址 */
const url = computed(() => {
  const preset = PRESETS.find((item) => item.file === presetKey.value);
  return preset ? preset.url : DEFAULT_PRESET.url;
});

/** 按当前实例数准备舞台占位 */
function ensureItems() {
  const list = [];
  for (let i = 0; i < count.value; i++) {
    list.push(items.value[i] || { id: i, el: null, player: null, frames: 0, fps: 0, gap: 0 });
  }
  items.value = list;
}

/**
 * 收集 v-for 里的舞台 DOM
 * @param {number} index 序号
 * @param {HTMLElement|null} el DOM 元素
 */
function setStageEl(index, el) {
  if (items.value[index]) items.value[index].el = el;
}

/**
 * 播放状态文案
 * @param {{player:any}} item 实例项
 * @returns {string}
 */
function playStateOf(item) {
  if (!item.player) return "空闲";
  return item.player.playState === VapPlayState.PLAYING ? "运行中" : "已停止";
}

/**
 * 每秒采样，聚合统计
 * @param {boolean} [reset] 是否重置计数
 */
function sample(reset = false) {
  let total = 0;
  let min = Infinity;
  let maxGap = 0;
  let frames = 0;
  for (const item of items.value) {
    if (reset) {
      item.frames = 0;
      item.gap = 0;
      continue;
    }
    item.fps = item.frames;
    total += item.frames;
    frames += item.frames;
    if (item.frames < min) min = item.frames;
    if (item.gap > maxGap) maxGap = item.gap;
    item.frames = 0;
    item.gap = 0;
  }
  stats.totalFps = total;
  stats.frames += frames;
  stats.avgFps = items.value.length ? Math.round(total / items.value.length) : 0;
  stats.minFps = Number.isFinite(min) ? min : 0;
  stats.maxGap = Number(maxGap.toFixed(1));
}

/**
 * 停止压测并销毁实例
 * @param {boolean} [keepRunning] 内部重启时保留运行标记
 */
function stop(keepRunning = false) {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  for (const item of items.value) {
    if (!item.player) continue;
    try {
      item.player.destroy();
    } catch (e) {
      /* 已销毁 */
    }
    item.player = null;
  }
  if (keepRunning) return;
  running.value = false;
  stats.totalFps = 0;
  stats.avgFps = 0;
  stats.minFps = 0;
  stats.maxGap = 0;
  stats.frames = 0;
}

/** 启动压测 */
async function start() {
  ensureItems();
  stop(true);
  running.value = true;
  for (const item of items.value) {
    if (!item.el) continue;
    const player = new CustomVap(item.el, {
      loop: Number(loop.value),
      muted: true,
      isPreciseFrame: precise.value,
    });
    item.player = player;
    item.frames = 0;
    item.fps = 0;
    item.gap = 0;
    let last = 0;
    player.on("process", () => {
      const now = performance.now();
      if (last) item.gap = Math.max(item.gap, now - last);
      last = now;
      item.frames++;
    });
    await player.load(url.value);
    await player.play();
  }
  sample(true);
  if (timer) clearInterval(timer);
  timer = setInterval(sample, 1000);
}

/** 修改实例数（运行中则重启） */
function applyCount() {
  if (running.value) start();
  else ensureItems();
}

ensureItems();
onBeforeUnmount(() => stop());
</script>

<template>
  <div class="stress">
    <section class="card stress-bar">
      <div class="field">
        <label>素材</label>
        <Dropdown v-model="presetKey" :options="presetOptions" :disabled="running" aria-label="压测素材" />
      </div>

      <div class="field field-w120">
        <label>实例数 {{ count }}</label>
        <input v-model.number="count" class="range" type="range" min="1" :max="maxInstances" step="1" @change="applyCount" />
      </div>

      <div class="field field-w120">
        <label>循环（0 无限）</label>
        <input v-model.number="loop" class="input input-sm" type="number" min="0" />
      </div>

      <label class="switch switch-sm">
        <input v-model="precise" type="checkbox" :disabled="running" />
        <span>精确帧 rVFC</span>
      </label>

      <div class="row-actions">
        <button class="btn btn-primary" @click="start">启动</button>
        <button class="btn" @click="stop()">停止</button>
      </div>
    </section>

    <section class="stats">
      <div class="stat">
        <span class="stat-label">总 FPS</span>
        <strong class="stat-value">{{ stats.totalFps }}</strong>
      </div>
      <div class="stat">
        <span class="stat-label">平均实例 FPS</span>
        <strong class="stat-value">{{ stats.avgFps }}</strong>
      </div>
      <div class="stat">
        <span class="stat-label">最差实例 FPS</span>
        <strong class="stat-value">{{ stats.minFps }}</strong>
      </div>
      <div class="stat">
        <span class="stat-label">最长帧间隔</span>
        <strong class="stat-value">{{ stats.maxGap }}<em>ms</em></strong>
      </div>
      <div class="stat">
        <span class="stat-label">累计帧数</span>
        <strong class="stat-value">{{ stats.frames }}</strong>
      </div>
    </section>

    <section class="stress-grid" :style="{ '--cols': Math.min(count, 4) }">
      <div v-for="(item, index) in items" :key="item.id" class="stress-cell">
        <div :ref="(el) => setStageEl(index, el)" class="stress-stage"></div>
        <div class="stress-meta">
          <span>#{{ index + 1 }}</span>
          <span class="badge" :class="item.player ? 'badge-green' : 'badge-slate'">{{ playStateOf(item) }}</span>
          <span class="muted">{{ item.fps }} fps</span>
        </div>
      </div>
    </section>
  </div>
</template>
