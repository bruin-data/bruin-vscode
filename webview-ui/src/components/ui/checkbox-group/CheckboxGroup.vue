<template>
  <div class="flex flex-col w-full">
    <button
      @click="toggleExpanded"
      class="flex items-center gap-2 mt-2 text-xs text-textLink-activeForeground hover:text-editorLink-activeForeground transition-colors"
    >
      <span>{{ label }}</span>
      <component
        :is="expanded ? ChevronUpIcon : ChevronDownIcon"
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>

    <div v-if="expanded" class="flex flex-wrap rounded-none mt-2">
      <vscode-checkbox
        v-for="(item, index) in checkboxItems"
        :key="index"
        @change="handleCheckboxChange(item, $event)"
        :checked="item.checked"
      >
        {{ item.name }}
      </vscode-checkbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { CheckboxItems } from "@/types";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  checkboxItems: CheckboxItems[];
  label: string;
}>();

const expanded = ref(false);

function toggleExpanded() {
  expanded.value = !expanded.value;
}

function handleCheckboxChange(item: any, event: any) {
  item.checked = event.target.checked;
}
</script>
