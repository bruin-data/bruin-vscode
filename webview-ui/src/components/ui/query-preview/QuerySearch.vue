
<template>
  <div
    v-if="visible"
    class="transition-all duration-300 flex items-center"
  >
    <input
      ref="searchInputRef"
      v-model="searchValue"
      placeholder="Search"
      class="w-32 h-6 bg-editorWidget-bg text-xs text-editor-fg focus:outline-none"
      @keydown.esc="close"
      @input="handleInput"
    />
    <div class="flex items-center ml-2">
      <span class="text-2xs text-editor-fg mr-2" v-if="filteredCount !== null">
        {{ filteredCount }} / {{ totalCount }}
      </span>
      <vscode-button appearance="icon" title="Close (Esc)" @click="close">
        <span class="codicon codicon-close"></span>
      </vscode-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  filteredCount: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["update:visible", "update:searchTerm", "close"]);

const searchInputRef = ref<HTMLInputElement | null>(null);
const searchValue = ref("");

// Watch for visibility changes to focus input when shown
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        if (searchInputRef.value) {
          searchInputRef.value.focus();
        }
      });
    }
  }
);

// Handle search input changes
const handleInput = () => {
  emit("update:searchTerm", searchValue.value);
};

// Close the search component
const close = () => {
  searchValue.value = "";
  emit("update:searchTerm", "");
  emit("update:visible", false);
  emit("close");
};
</script>
