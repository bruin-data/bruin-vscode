<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-commandCenter-border">
      <thead class="bg-editor-bg">
        <tr>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider text-editor-fg uppercase">
            Column 1
          </th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider text-editor-fg uppercase">
            Column 2
          </th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium tracking-wider text-editor-fg uppercase">
            Column 3
          </th>
        </tr>
      </thead>
      <tbody class="bg-editor-bg divide-y divide-commandCenter-border">
        <tr v-for="row in output.split('\n')" :key="row">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-editor-fg">
              {{ row.split(',')[0] }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-editor-fg">
              {{ row.split(',')[1] }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-editor-fg">
              {{ row.split(',')[2] }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


<script setup lang="ts">

const props = defineProps<{
   output: string
}>();
</script>
