<template>
      <div class="flex flex-wrap sm:space-x-4">
        <vscode-checkbox v-for="(item, index) in props.checkboxItems" autofocus
          :key="index" 
          @change="handleCheckboxChange(item, $event)"
          :checked="item.checked">
          {{ item.name }}   
        </vscode-checkbox>

    </div>
</template>
<script setup lang="ts">
import type { CheckboxItems } from "@/types";

const props = defineProps<{
    checkboxItems: CheckboxItems[];
}>();
function handleCheckboxChange(item: any, event: any) {
    item.checked = event.target.checked;
}
</script>