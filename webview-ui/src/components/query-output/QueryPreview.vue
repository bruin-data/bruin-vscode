<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-commandCenter-border">
      <thead class="bg-editor-bg">
        <tr>
          <th v-for="header in headers" :key="header" class="px-6 py-3 text-left text-xs font-medium tracking-wider text-editor-fg uppercase">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-editor-bg divide-y divide-commandCenter-border">
        <tr v-for="(row, index) in rows" :key="index">
          <td v-for="(column, colIndex) in row" :key="colIndex" class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-editor-fg">
              {{ column }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


<script setup lang="ts">
import {ref} from "vue"

const props = defineProps<{
   output: string
}>();

const rows = ref(props.output.split('\n').slice(1).map(row => row.split(','))); // Skip header row
const headers = ref(props.output.split('\n')[0].split(',')); // Get the header row


</script>
