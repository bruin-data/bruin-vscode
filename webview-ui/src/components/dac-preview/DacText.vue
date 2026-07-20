<template>
  <div class="dac-text">
    <component
      v-for="(block, i) in blocks"
      :key="i"
      :is="block.tag"
      class="dac-text-block"
    >{{ block.text }}</component>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DacWidget } from "./types";

const props = defineProps<{ widget: DacWidget }>();

// Minimal, safe markdown-ish rendering: headings by leading '#', everything
// else as a paragraph. Text is bound via interpolation so no raw HTML is
// injected. Enough for the "text" widget's headers/notes in a compact preview.
const blocks = computed(() => {
  const content = props.widget.content ?? "";
  return content
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const h = chunk.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = Math.min(h[1].length, 3);
        return { tag: `h${level + 1}`, text: h[2] };
      }
      return { tag: "p", text: chunk };
    });
});
</script>

<style scoped>
.dac-text {
  color: var(--vscode-foreground);
  font-size: 13px;
}
.dac-text-block {
  margin: 0 0 6px;
}
.dac-text h2 {
  font-size: 16px;
}
.dac-text h3 {
  font-size: 14px;
}
.dac-text h4 {
  font-size: 13px;
}
</style>
