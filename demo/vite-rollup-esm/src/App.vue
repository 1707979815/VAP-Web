<script setup>
/**
 * 应用外壳：顶栏 + hash 路由（单例调试台 / 多实例压测）。
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import SingleView from "./views/SingleView.vue";
import StressView from "./views/StressView.vue";

const routes = [
  { key: "single", label: "单例调试台", hint: "播放 / 帧控制 / 插槽" },
  { key: "stress", label: "多实例压测", hint: "并发与帧率" },
];

const route = ref("single");

/** 从 location.hash 解析当前视图 */
function syncRoute() {
  const key = (location.hash || "").replace(/^#\/?/, "");
  route.value = routes.some((item) => item.key === key) ? key : "single";
}

/**
 * 切换视图（写回 hash，便于分享链接）
 * @param {string} key 视图标识
 */
function go(key) {
  location.hash = `#/${key}`;
  route.value = key;
}

onMounted(() => {
  syncRoute();
  window.addEventListener("hashchange", syncRoute);
});
onBeforeUnmount(() => window.removeEventListener("hashchange", syncRoute));
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">VAP</span>
        <span class="brand-text">
          <strong>custom-vap</strong>
          <em>WebGL 动效播放器 · 在线演示</em>
        </span>
      </div>

      <nav class="tabs">
        <button
          v-for="item in routes"
          :key="item.key"
          class="tab"
          :class="{ active: route === item.key }"
          :title="item.hint"
          @click="go(item.key)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="topbar-meta">
        <span class="dot"></span>
        <span>Vue 3 · 零框架依赖播放器</span>
      </div>
    </header>

    <main class="main">
      <SingleView v-if="route === 'single'" />
      <StressView v-else />
    </main>
  </div>
</template>
