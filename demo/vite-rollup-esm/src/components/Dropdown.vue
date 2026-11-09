<script setup>
/**
 * 自定义下拉选择器：替代原生 `<select>`，统一样式与交互。
 *
 * 面板通过 `Teleport` 挂到 body 并用 `position: fixed` 定位，避免被
 * `.panel` 的 `overflow-y: auto` 裁切；打开期间监听滚动/尺寸变化实时跟随按钮位置。
 * 支持鼠标点选、点击外部关闭、Esc 关闭、↑/↓/Home/End/Enter 键盘操作与 aria 语义。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  /** 当前选中值 */
  modelValue: { type: [String, Number], default: "" },
  /** 选项列表：{ value, label, hint? } */
  options: { type: Array, default: () => [] },
  /** 是否禁用 */
  disabled: { type: Boolean, default: false },
  /** 无选中时的占位文案 */
  placeholder: { type: String, default: "请选择" },
  /** 尺寸：md（默认）| sm */
  size: { type: String, default: "md" },
  /** 无障碍标签 */
  ariaLabel: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "change"]);

const btnRef = ref(null);
const listRef = ref(null);
const open = ref(false);
const active = ref(0);
/** 面板定位信息（up 时用 bottom 贴住按钮上沿） */
const placement = ref({ left: 0, width: 0, top: 0, bottom: 0, up: false });

/** 当前选中项 */
const current = computed(
  () => props.options.find((item) => item.value === props.modelValue) || null,
);

/** 面板内联样式 */
const panelStyle = computed(() => {
  const p = placement.value;
  const base = { left: `${p.left}px`, width: `${p.width}px` };
  return p.up ? { ...base, bottom: `${p.bottom}px` } : { ...base, top: `${p.top}px` };
});

/** 依据按钮与视口重新计算面板位置 */
function measure() {
  const el = btnRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const panelHeight = listRef.value ? listRef.value.offsetHeight : props.options.length * 34 + 12;
  const spaceBelow = window.innerHeight - rect.bottom;
  const up = spaceBelow < panelHeight + 12 && rect.top > spaceBelow;
  placement.value = {
    left: rect.left,
    width: rect.width,
    top: rect.bottom + 4,
    bottom: window.innerHeight - rect.top + 4,
    up,
  };
}

/** 让高亮项滚入可视区域 */
function scrollActiveIntoView() {
  const list = listRef.value;
  if (!list) return;
  const el = list.children[active.value];
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
}

/** 展开面板 */
async function openPanel() {
  if (props.disabled || open.value) return;
  open.value = true;
  active.value = Math.max(
    0,
    props.options.findIndex((item) => item.value === props.modelValue),
  );
  measure();
  await nextTick();
  // 面板渲染出真实高度后再定位一次，避免贴近视口底部时方向判断错误
  measure();
  scrollActiveIntoView();
}

/**
 * 关闭面板
 * @param {boolean} [focusButton] 是否把焦点交还按钮
 */
function closePanel(focusButton = false) {
  if (!open.value) return;
  open.value = false;
  if (focusButton && btnRef.value) btnRef.value.focus();
}

/** 切换展开状态 */
function toggle() {
  if (open.value) closePanel();
  else openPanel();
}

/**
 * 选中某一项
 * @param {{value:string|number,label:string}} option 选项
 */
function selectOption(option) {
  if (!option) return;
  if (option.value !== props.modelValue) {
    emit("update:modelValue", option.value);
    emit("change", option.value);
  }
  closePanel(true);
}

/**
 * 移动高亮项
 * @param {number} delta 偏移量
 */
function move(delta) {
  const total = props.options.length;
  if (!total) return;
  active.value = (active.value + delta + total) % total;
  scrollActiveIntoView();
}

/**
 * 按钮键盘操作
 * @param {KeyboardEvent} event 键盘事件
 */
function onButtonKeydown(event) {
  if (props.disabled) return;
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (open.value) move(1);
      else openPanel();
      break;
    case "ArrowUp":
      event.preventDefault();
      if (open.value) move(-1);
      else openPanel();
      break;
    case "Enter":
    case " ":
      event.preventDefault();
      if (open.value) selectOption(props.options[active.value]);
      else openPanel();
      break;
    case "Home":
      if (!open.value) return;
      event.preventDefault();
      active.value = 0;
      scrollActiveIntoView();
      break;
    case "End":
      if (!open.value) return;
      event.preventDefault();
      active.value = Math.max(0, props.options.length - 1);
      scrollActiveIntoView();
      break;
    case "Escape":
      if (!open.value) return;
      event.preventDefault();
      closePanel(true);
      break;
    case "Tab":
      closePanel();
      break;
    default:
      break;
  }
}

/**
 * 点击组件外部关闭
 * @param {PointerEvent} event 指针事件
 */
function onDocumentPointerDown(event) {
  const target = event.target;
  if (btnRef.value && btnRef.value.contains(target)) return;
  if (listRef.value && listRef.value.contains(target)) return;
  closePanel();
}

/** 打开期间滚动 / 尺寸变化时跟随按钮 */
function syncPosition() {
  if (!open.value) return;
  measure();
}

watch(open, (value) => {
  if (value) {
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);
  } else {
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    window.removeEventListener("scroll", syncPosition, true);
    window.removeEventListener("resize", syncPosition);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("scroll", syncPosition, true);
  window.removeEventListener("resize", syncPosition);
});
</script>

<template>
  <div class="dd" :class="[`dd-${size}`, { 'is-open': open, 'is-disabled': disabled }]">
    <button
      ref="btnRef"
      type="button"
      class="dd-btn"
      :class="{ 'is-open': open }"
      :disabled="disabled"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="ariaLabel || undefined"
      @click="toggle"
      @keydown="onButtonKeydown"
    >
      <span class="dd-value" :class="{ 'dd-placeholder': !current }">
        {{ current ? current.label : placeholder }}
      </span>
      <span v-if="current && current.hint" class="dd-hint">{{ current.hint }}</span>
      <span class="dd-caret" aria-hidden="true"></span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="listRef"
        class="dd-panel"
        :style="panelStyle"
        role="listbox"
        tabindex="-1"
      >
        <button
          v-for="(item, index) in options"
          :key="String(item.value)"
          type="button"
          class="dd-option"
          :class="{ active: index === active, selected: item.value === modelValue }"
          role="option"
          :aria-selected="item.value === modelValue ? 'true' : 'false'"
          @mouseenter="active = index"
          @click="selectOption(item)"
        >
          <span class="dd-option-label">{{ item.label }}</span>
          <span v-if="item.hint" class="dd-option-hint">{{ item.hint }}</span>
        </button>
        <p v-if="!options.length" class="dd-empty">无可选项</p>
      </div>
    </Teleport>
  </div>
</template>
