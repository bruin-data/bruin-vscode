<template>
  <span
    ref="btn"
    class="dac-info-icon"
    tabindex="0"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focus="show"
    @blur="scheduleHide"
  >
    <span class="codicon codicon-info"></span>

    <Teleport to="body">
      <div
        v-if="visible"
        ref="pop"
        class="dac-qi-pop"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px`, opacity: pos.ready ? 1 : 0 }"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide"
      >
        <div class="dac-qi-head">
          <span class="dac-qi-title">SQL Query</span>
          <button type="button" class="dac-qi-copy" @click="copy">
            <span class="codicon" :class="copied ? 'codicon-check' : 'codicon-copy'"></span>
            {{ copied ? "Copied" : "Copy" }}
          </button>
        </div>
        <pre class="dac-qi-code hljs"><code v-html="highlighted"></code></pre>
      </div>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from "vue";
import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import "highlight.js/styles/github-dark-dimmed.css";

if (!hljs.getLanguage("sql")) {
  hljs.registerLanguage("sql", sql);
}

const props = defineProps<{ query: string }>();

const btn = ref<HTMLElement | null>(null);
const pop = ref<HTMLElement | null>(null);
const visible = ref(false);
const copied = ref(false);
const pos = reactive({ top: -9999, left: -9999, ready: false });

let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const highlighted = computed(() => {
  try {
    return hljs.highlight(props.query, { language: "sql" }).value;
  } catch {
    return escapeHtml(props.query);
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

function clearTimers() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

// Reveal after a short dwell, matching dac's hover-to-inspect feel.
function onEnter() {
  clearTimers();
  showTimer = setTimeout(show, 450);
}
function onLeave() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  scheduleHide();
}
function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}
function scheduleHide() {
  cancelHide();
  hideTimer = setTimeout(() => {
    visible.value = false;
    pos.ready = false;
    copied.value = false;
  }, 150);
}

async function show() {
  cancelHide();
  visible.value = true;
  await nextTick();
  place();
  window.addEventListener("scroll", scheduleHide, true);
}

// Fixed positioning via a body teleport — no ancestor overflow/stacking can
// clip it (the reason an in-widget popover was hidden behind the panel edge).
function place() {
  const b = btn.value?.getBoundingClientRect();
  const p = pop.value?.getBoundingClientRect();
  if (!b || !p) {
    return;
  }
  let top = b.top - p.height - 6;
  let left = b.left + b.width / 2 - p.width / 2;
  if (left < 8) {
    left = 8;
  }
  if (left + p.width > window.innerWidth - 8) {
    left = window.innerWidth - 8 - p.width;
  }
  if (top < 8) {
    top = b.bottom + 6; // not enough room above → drop below
  }
  pos.top = top;
  pos.left = left;
  pos.ready = true;
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.query);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* clipboard blocked; ignore */
  }
}

onBeforeUnmount(() => {
  clearTimers();
  window.removeEventListener("scroll", scheduleHide, true);
});
</script>

<style scoped>
.dac-info-icon {
  margin-left: auto;
  color: var(--vscode-descriptionForeground);
  cursor: help;
  line-height: 1;
}
.dac-info-icon:hover,
.dac-info-icon:focus {
  color: var(--vscode-foreground);
  outline: none;
}
.dac-info-icon .codicon {
  font-size: 13px;
}
</style>

<style>
/* unscoped: the popover is teleported to <body>, outside the component root */
.dac-qi-pop {
  position: fixed;
  z-index: 99999;
  min-width: 280px;
  width: max-content;
  max-width: min(560px, 92vw);
  background: var(--vscode-editorHoverWidget-background, var(--vscode-editor-background));
  border-radius: 6px;
  border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-panel-border));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  transition: opacity 0.1s ease;
}
.dac-qi-head {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background: var(--vscode-editorHoverWidget-statusBarBackground, var(--vscode-editorWidget-background));
  border-bottom: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-panel-border));
}
.dac-qi-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vscode-descriptionForeground);
}
.dac-qi-copy {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  padding: 2px 4px;
  border-radius: 3px;
}
.dac-qi-copy:hover {
  color: var(--vscode-foreground);
  background: var(--vscode-toolbar-hoverBackground);
}
.dac-qi-copy .codicon {
  font-size: 12px;
}
.dac-qi-code.hljs {
  margin: 0;
  padding: 10px 12px;
  max-height: 320px;
  overflow-x: hidden;
  overflow-y: auto;
  font-family: var(--vscode-editor-font-family, "monospace");
  font-size: 11.5px;
  line-height: 1.55;
  /* wrap long SQL so it stays inside the popover instead of bleeding over
     neighbouring widgets (the reported overflow) */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  tab-size: 2;
}
</style>
