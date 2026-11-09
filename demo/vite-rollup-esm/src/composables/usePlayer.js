/**
 * @file usePlayer.js
 * @description 单实例播放器的 Vue3 组合式封装：创建/销毁实例、订阅全部事件、维护播放状态、
 * 当前帧、FPS 与事件日志，并把帧级操作（seek / step / playRange）收敛成方法。
 */
import { onBeforeUnmount, reactive } from "vue";
import { CustomVap, VapPlayState, isVAPError } from "../vap/engine.js";

/** 需要落到日志里的事件（process 单独处理，避免刷屏） */
const LOG_EVENTS = [
  "load",
  "ready",
  "start",
  "loop",
  "pause",
  "resume",
  "stop",
  "end",
  "error",
  "visible",
  "destroy",
  "webglcontextlost",
  "webglcontextrestored",
];

/** 日志条数上限 */
const MAX_LOG = 300;

/**
 * 播放状态枚举 → 中文文案
 * @param {number} value VapPlayState
 * @returns {string}
 */
export function playStateText(value) {
  switch (value) {
    case VapPlayState.IDLE:
      return "空闲";
    case VapPlayState.LOADING:
      return "加载中";
    case VapPlayState.READY:
      return "就绪";
    case VapPlayState.PLAYING:
      return "播放中";
    case VapPlayState.PAUSED:
      return "已暂停";
    case VapPlayState.STOPPED:
      return "已停止";
    case VapPlayState.PAUSED_BY_INVISIBLE:
      return "不可见暂停";
    default:
      return "未知";
  }
}

/**
 * 事件 payload → 一行摘要
 * @param {string} name 事件名
 * @param {any} payload 事件参数
 * @returns {string}
 */
function summarize(name, payload) {
  if (!payload || typeof payload !== "object") return "";
  switch (name) {
    case "load":
      return payload.config
        ? `${payload.config.info.f} 帧 / ${payload.config.info.fps}fps${
            payload.config.info.isVapx ? " · VAPX" : ""
          }`
        : "";
    case "loop":
      return `loopCount=${payload.loopCount}`;
    case "end":
      return `frame=${payload.frame}`;
    case "error":
      return `${payload.code} · ${payload.tips}`;
    case "visible":
      return payload.isVisible ? "进入视口" : "离开视口";
    case "destroy":
      return `playState=${playStateText(payload.playState)}`;
    default:
      return typeof payload.currentTime === "number"
        ? `t=${payload.currentTime.toFixed(2)}s`
        : "";
  }
}

/**
 * 单实例播放器组合式函数（需在 setup 中调用）
 * @returns 实例状态与操作方法
 */
export function usePlayer() {
  const state = reactive({
    /** @type {"idle"|"loading"|"ready"|"playing"|"paused"|"stopped"|"error"} */
    status: "idle",
    url: "",
    loading: false,
    config: null,
    info: null,
    /** @type {Array<{srcId:string,srcType:string,srcTag:string,w:number,h:number}>} */
    srcList: [],
    currentFrame: 0,
    totalFrames: 0,
    fps: 0,
    playState: VapPlayState.IDLE,
    error: null,
  });

  /** @type {Array<{id:number,time:string,name:string,detail:string,level:string}>} */
  const log = reactive([]);
  let logSeq = 0;
  let logFrames = false;

  /** @type {CustomVap | null} */
  let player = null;
  let frameCounter = 0;
  let fpsTimer = null;
  let loadSeq = 0;

  /**
   * 追加一条日志
   * @param {string} name 事件名
   * @param {string} detail 摘要
   * @param {"info"|"ok"|"warn"|"error"} [level] 级别
   */
  function pushLog(name, detail = "", level = "info") {
    const d = new Date();
    const time =
      `${String(d.getHours()).padStart(2, "0")}:` +
      `${String(d.getMinutes()).padStart(2, "0")}:` +
      `${String(d.getSeconds()).padStart(2, "0")}.` +
      `${String(d.getMilliseconds()).padStart(3, "0")}`;
    log.push({ id: ++logSeq, time, name, detail, level });
    if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
  }

  /** 清空日志 */
  function clearLog() {
    log.splice(0, log.length);
  }

  /**
   * 是否把 process 事件写入日志
   * @param {boolean} value 开关
   */
  function setLogFrames(value) {
    logFrames = !!value;
  }

  /** 同步 playState 到响应式状态 */
  function syncState() {
    if (!player) return;
    state.playState = player.playState;
  }

  /**
   * 事件接线
   * @param {CustomVap} instance 播放器实例
   */
  function bindEvents(instance) {
    for (const name of LOG_EVENTS) {
      instance.on(name, (payload) => {
        if (name === "load") {
          state.config = payload.config || null;
          state.info = payload.config ? payload.config.info : null;
          state.srcList = (payload.config && payload.config.src) || [];
          state.totalFrames = payload.config ? payload.config.info.f : 0;
          state.currentFrame = 0;
          state.error = null;
        }
        if (name === "error") {
          state.error = payload;
          state.status = "error";
        }
        if (name === "ready") state.status = "ready";
        if (name === "start") state.status = "playing";
        if (name === "pause") state.status = "paused";
        if (name === "resume") state.status = "playing";
        if (name === "stop") state.status = "stopped";
        if (name === "end") state.status = "stopped";
        if (name === "destroy") state.status = "idle";
        syncState();
        const level =
          name === "error" ? "error" : name === "stop" || name === "destroy" ? "warn" : "info";
        pushLog(name, summarize(name, payload), level);
      });
    }

    instance.on("process", (payload) => {
      // process.frame 是内部帧索引（0 起），对外展示统一 +1
      state.currentFrame = payload.frame + 1;
      frameCounter++;
      if (logFrames && frameCounter % 6 === 0) {
        pushLog(
          "process",
          `frame=${payload.frame} t=${payload.currentTime.toFixed(2)}`,
          "info",
        );
      }
    });
  }

  /**
   * 在容器内创建播放器（重复调用会先销毁旧实例）
   * @param {HTMLElement} el 舞台容器
   * @param {object} [options] 初始配置
   * @returns {CustomVap}
   */
  function create(el, options = {}) {
    destroy();
    player = new CustomVap(el, {
      loop: 1,
      muted: true,
      isPreciseFrame: true,
      isClickable: true,
      ...options,
    });
    bindEvents(player);
    if (fpsTimer) clearInterval(fpsTimer);
    frameCounter = 0;
    fpsTimer = setInterval(() => {
      state.fps = frameCounter;
      frameCounter = 0;
    }, 1000);
    return player;
  }

  /**
   * 加载素材
   * @param {string} url 素材地址
   */
  async function load(url) {
    if (!player) return;
    const seq = ++loadSeq;
    state.loading = true;
    state.status = "loading";
    state.error = null;
    state.url = url;
    try {
      await player.load(url);
      if (seq !== loadSeq) return;
      state.status = "ready";
      syncState();
    } catch (e) {
      // load 内部已 emit error，这里兜住异常避免未处理的 Promise 拒绝
      if (seq === loadSeq) {
        state.status = "error";
        state.error = {
          code: isVAPError(e) ? e.code : "UNKNOWN",
          message: e && e.message ? e.message : String(e),
          tips: isVAPError(e) ? e.tips : "",
        };
      }
    } finally {
      if (seq === loadSeq) state.loading = false;
    }
  }

  /**
   * 播放
   * @param {number} [loop] 循环次数，省略则用实例配置
   */
  async function play(loop) {
    if (!player) return;
    await player.play(loop);
    syncState();
  }

  /**
   * 区间播放（对外帧号 1 起）
   * @param {number} start 起始帧
   * @param {number} end 结束帧
   * @param {number} [loop] 循环次数
   */
  async function playRange(start, end, loop) {
    if (!player) return;
    await player.playRange(start, end, loop);
    syncState();
  }

  /**
   * 从当前帧播放到末帧
   * @param {number} [loop] 循环次数
   */
  async function playFromCurrent(loop) {
    if (!player || !state.totalFrames) return;
    const start = Math.min(Math.max(1, state.currentFrame || 1), state.totalFrames);
    const end = state.totalFrames;
    if (start >= end) {
      await playRange(1, end, loop);
      return;
    }
    await playRange(start, end, loop);
  }

  /** 暂停 */
  function pause() {
    if (!player) return;
    player.pause();
    syncState();
  }

  /** 恢复播放 */
  function resume() {
    if (!player) return;
    player.resume();
    syncState();
  }

  /** 停止 */
  function stop() {
    if (!player) return;
    player.stop();
    syncState();
  }

  /**
   * 定格到指定帧（对外帧号 1 起）
   * @param {number} frame 帧号
   */
  async function seek(frame) {
    if (!player) return;
    const target = Math.min(Math.max(1, Math.round(frame)), state.totalFrames || 1);
    await player.seek(target);
    state.currentFrame = target;
    syncState();
  }

  /**
   * 相对当前帧步进
   * @param {number} delta 步进帧数
   */
  async function step(delta) {
    const base = state.currentFrame || 1;
    await seek(base + delta);
  }

  /**
   * 修改单个运行期选项
   * @param {string} key VapOptions 字段
   * @param {any} value 值
   */
  function setOption(key, value) {
    if (!player) return;
    player.updateOptions({ [key]: value });
    syncState();
  }

  /**
   * 批量修改运行期选项
   * @param {object} options 选项
   */
  function setOptions(options) {
    if (!player) return;
    player.updateOptions(options);
    syncState();
  }

  /**
   * 设置插槽图片
   * @param {string} tag 插槽 srcTag
   * @param {string} url 图片地址
   */
  async function setImage(tag, url) {
    if (!player) return;
    await player.setImage(tag, url);
    pushLog("setImage", `${tag} ← ${url.split("/").pop()}`, "ok");
  }

  /**
   * 设置插槽文本
   * @param {string} tag 插槽 srcTag
   * @param {string} text 文本
   */
  function setText(tag, text) {
    if (!player) return;
    player.setText(tag, text);
    pushLog("setText", `${tag} ← "${text}"`, "ok");
  }

  /**
   * 注册单插槽点击回调
   * @param {string} tag 插槽 srcTag
   * @param {(() => void) | null} handler 回调；传 null 表示停用
   */
  function registerSlotClick(tag, handler) {
    if (!player) return;
    player.onClick(tag, handler || (() => void 0));
  }

  /**
   * 注册全插槽点击回调
   * @param {(info: {srcId:string,srcTag:string,frame:number[]}) => void} handler 回调
   */
  function registerAllClick(handler) {
    if (!player) return;
    player.onAllClick(handler || (() => void 0));
  }

  /**
   * 开关点击响应
   * @param {boolean} value 是否响应点击
   */
  function setClickable(value) {
    setOption("isClickable", value);
  }

  /**
   * 跳过渲染（性能排查）
   * @param {boolean} value 是否跳过
   */
  function skipRender(value) {
    if (!player) return;
    player.skipRender(value);
    pushLog("skipRender", value ? "已开启" : "已关闭", "warn");
  }

  /** 销毁实例（保留舞台 DOM） */
  function destroy() {
    if (fpsTimer) {
      clearInterval(fpsTimer);
      fpsTimer = null;
    }
    if (!player) return;
    try {
      player.destroy();
    } catch (e) {
      /* 已销毁 */
    }
    player = null;
    state.playState = VapPlayState.IDLE;
    state.currentFrame = 0;
  }

  onBeforeUnmount(() => {
    destroy();
    log.splice(0, log.length);
  });

  return {
    state,
    log,
    get player() {
      return player;
    },
    create,
    load,
    play,
    playRange,
    playFromCurrent,
    pause,
    resume,
    stop,
    seek,
    step,
    setOption,
    setOptions,
    setImage,
    setText,
    registerSlotClick,
    registerAllClick,
    setClickable,
    skipRender,
    destroy,
    clearLog,
    setLogFrames,
    pushLog,
  };
}
