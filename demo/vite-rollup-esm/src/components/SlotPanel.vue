<script setup>
/**
 * VAPX 融合层插槽配置区：按素材 `src` 列表逐项生成图片/文本配置与点击回调开关。
 * 只有素材带插槽（isVapx = 1 且 src 非空）时由父组件渲染本组件。
 */
import { reactive, ref, watch } from "vue";

const props = defineProps({
  /** @type {Array<{srcId:string,srcType:string,srcTag:string,w:number,h:number}>} */
  slots: { type: Array, default: () => [] },
  /** 最近命中的插槽记录 */
  clicks: { type: Array, default: () => [] },
  /** 播放器是否已开启 isClickable */
  clickable: { type: Boolean, default: true },
});
const emit = defineEmits(["image", "text", "toggle-click", "fill-demo", "clear-clicks"]);

/** 每个插槽的输入草稿：url / text / 是否启用点击回调 */
const draft = reactive({});
const expanded = ref(true);

watch(
  () => props.slots,
  (list) => {
    for (const slot of list) {
      if (!draft[slot.srcTag]) draft[slot.srcTag] = { url: "", text: "", click: false };
    }
  },
  { immediate: true, deep: true },
);

/**
 * 读取插槽草稿（缺省时补一个）
 * @param {string} tag 插槽 srcTag
 * @returns {{url:string,text:string,click:boolean}}
 */
function d(tag) {
  if (!draft[tag]) draft[tag] = { url: "", text: "", click: false };
  return draft[tag];
}

/**
 * 点击回调开关变化
 * @param {string} tag 插槽 srcTag
 */
function toggleClick(tag) {
  emit("toggle-click", tag, d(tag).click);
}
</script>

<template>
  <div class="slots">
    <div class="slots-head">
      <span class="slots-count">{{ slots.length }} 个插槽</span>
      <span v-if="!clickable" class="badge badge-amber">isClickable 已关闭</span>
      <button class="btn btn-ghost btn-xs" @click="expanded = !expanded">
        {{ expanded ? "收起" : "展开" }}
      </button>
    </div>

    <div v-show="expanded" class="slot-list">
      <div v-for="slot in slots" :key="slot.srcTag" class="slot-card">
        <div class="slot-head">
          <code class="slot-tag">{{ slot.srcTag }}</code>
          <span class="badge" :class="slot.srcType === 'img' ? 'badge-blue' : 'badge-purple'">
            {{ slot.srcType === "img" ? "图片" : "文本" }}
          </span>
          <span class="slot-size">{{ slot.w }}×{{ slot.h }}</span>
        </div>

        <div v-if="slot.srcType === 'img'" class="slot-row">
          <input
            v-model="d(slot.srcTag).url"
            class="input"
            type="text"
            placeholder="图片地址，如 ./assets/4-ride.png"
            @keyup.enter="emit('image', slot.srcTag, d(slot.srcTag).url)"
          />
          <button class="btn btn-sm" @click="emit('image', slot.srcTag, d(slot.srcTag).url)">应用</button>
          <button class="btn btn-ghost btn-sm" @click="emit('fill-demo', slot.srcTag)">示例图</button>
        </div>

        <div v-else class="slot-row">
          <input
            v-model="d(slot.srcTag).text"
            class="input"
            type="text"
            placeholder="文本内容"
            @keyup.enter="emit('text', slot.srcTag, d(slot.srcTag).text)"
          />
          <button class="btn btn-sm" @click="emit('text', slot.srcTag, d(slot.srcTag).text)">应用</button>
        </div>

        <label class="switch switch-sm slot-click">
          <input v-model="d(slot.srcTag).click" type="checkbox" @change="toggleClick(slot.srcTag)" />
          <span>点击回调 onClick</span>
        </label>
      </div>

      <div class="slot-clicks">
        <div class="slot-clicks-head">
          <span>命中记录</span>
          <button class="btn btn-ghost btn-xs" @click="emit('clear-clicks')">清空</button>
        </div>
        <p v-if="!clicks.length" class="muted">
          播放后点击舞台上的插槽区域，会记录 srcTag 与命中矩形
        </p>
        <div v-for="(item, index) in clicks" :key="index" class="click-row">
          <code>{{ item.tag }}</code>
          <span class="muted">frame {{ item.frame }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
