<script setup>
/**
 * 事件时间线：按类型筛选、按级别着色、自动滚动到底部。
 */
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  /** @type {Array<{id:number,time:string,name:string,detail:string,level:string}>} */
  log: { type: Array, default: () => [] },
});
const emit = defineEmits(["clear"]);

const filters = [
  { key: "all", label: "全部" },
  { key: "play", label: "播放", names: ["ready", "start", "pause", "resume", "stop", "end", "loop"] },
  { key: "frame", label: "帧", names: ["process"] },
  {
    key: "load",
    label: "加载",
    names: ["load", "destroy", "webglcontextlost", "webglcontextrestored", "visible", "local"],
  },
  {
    key: "custom",
    label: "资源/操作",
    names: ["setImage", "setText", "skipRender", "click", "onClick", "seek", "playRange"],
  },
  { key: "error", label: "错误", names: ["error"] },
];

const filter = ref("all");
const autoScroll = ref(true);
const bodyRef = ref(null);

/**
 * 当前筛选条件是否命中
 * @param {{name:string}} entry 日志项
 * @returns {boolean}
 */
function match(entry) {
  const current = filters.find((item) => item.key === filter.value);
  if (!current || current.key === "all") return true;
  return current.names.includes(entry.name);
}

/** 清空（交给父组件处理） */
function clear() {
  emit("clear");
}

watch(
  () => props.log.length,
  async () => {
    if (!autoScroll.value) return;
    await nextTick();
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
  },
);
</script>

<template>
  <div class="log">
    <div class="log-toolbar">
      <div class="chips">
        <button
          v-for="item in filters"
          :key="item.key"
          class="chip"
          :class="{ active: filter === item.key }"
          @click="filter = item.key"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="log-actions">
        <label class="switch switch-sm">
          <input v-model="autoScroll" type="checkbox" />
          <span>跟随</span>
        </label>
        <button class="btn btn-ghost btn-xs" @click="clear">清空</button>
      </div>
    </div>

    <div ref="bodyRef" class="log-body">
      <p v-if="!log.length" class="log-empty">暂无事件，加载素材后这里会实时输出</p>
      <div
        v-for="item in log"
        v-show="match(item)"
        :key="item.id"
        class="log-row"
        :class="'lv-' + item.level"
      >
        <span class="log-time">{{ item.time }}</span>
        <span class="log-name">{{ item.name }}</span>
        <span class="log-detail">{{ item.detail }}</span>
      </div>
    </div>
  </div>
</template>
