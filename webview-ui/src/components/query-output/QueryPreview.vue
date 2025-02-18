<template>
  <div class="overflow-x-auto">
    <table v-if="parsedOutput" class="min-w-full divide-y divide-commandCenter-border">
      <thead class="bg-editor-bg">
        <tr>
          <th v-for="column in parsedOutput.columns" :key="column.name" class="px-6 py-3 text-left text-xs font-medium tracking-wider text-editor-fg uppercase">
            {{ column.name }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-editor-bg divide-y divide-commandCenter-border">
        <tr v-for="(row, index) in parsedOutput.rows" :key="index">
          <td v-for="(value, colIndex) in row" :key="colIndex" class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-editor-fg">
              {{ value }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


<script setup lang="ts">

import { computed } from 'vue';

interface QueryOutput {
  columns: { name: string }[];
  rows: (string | number)[][];
}

const props = defineProps<{
  output: any
}>();

const parsedOutput = computed(() => {
  if (!props.output) return null;
  try {
    return typeof props.output === 'string' ? JSON.parse(props.output) : props.output;
  } catch (e) {
    console.error('Error parsing output:', e);
    return null;
  }
});


</script>
