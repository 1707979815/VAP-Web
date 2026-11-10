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

      <div class="topbar-actions">
        <div class="ext-links">
          <a
            class="ext-link"
            href="https://www.npmjs.com/package/custom-vap"
            target="_blank"
            rel="noopener noreferrer"
            title="npm · custom-vap"
            aria-label="npm · custom-vap"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"
              />
            </svg>
          </a>
          <a
            class="ext-link"
            href="https://github.com/1707979815/VAP-Web"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub · VAP-Web"
            aria-label="GitHub · VAP-Web"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
          </a>
        </div>

        <div class="topbar-meta">
          <span class="dot"></span>
          <span>Vue 3 · 零框架依赖播放器</span>
        </div>
      </div>
    </header>

    <main class="main">
      <SingleView v-if="route === 'single'" />
      <StressView v-else />
    </main>
  </div>
</template>
