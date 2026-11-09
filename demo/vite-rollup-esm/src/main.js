/**
 * @file main.js
 * @description demo 入口：挂载 Vue3 应用（SFC + `<script setup>`，由 @vitejs/plugin-vue 编译）。
 */
import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

createApp(App).mount("#app");
