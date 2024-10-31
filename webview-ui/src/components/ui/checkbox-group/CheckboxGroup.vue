<template>
  <div class="flex flex-col w-full">
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

const props = defineProps<{
  checkboxItems: CheckboxItems[];
  label: string;
}>();

const expanded = ref(true);

function handleCheckboxChange(item: any, event: any) {
  item.checked = event.target.checked;
}
</script>
