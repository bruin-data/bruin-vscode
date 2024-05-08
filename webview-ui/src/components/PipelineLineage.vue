<template>
  <div style="height: 300px; width: 100%;">
    <VueFlow :nodes="nodes" :edges="edges" />
  </div>
</template>


<script setup>
import { VueFlow } from '@vue-flow/core';
import { ref } from 'vue'

const nodes = ref([
  { id: '1', type: 'input', label: 'Node 1', position: { x: 250, y: 5 } },
  { id: '2', label: 'Node 2', position: { x: 100, y: 100 }, },
  { id: '3', label: 'Node 3', position: { x: 400, y: 100 } },
  { id: '4', type: 'output', label: 'Node 4', position: { x: 400, y: 200 } },
])

const edges = ref([
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-2', source: '1', target: '2', animated: true },
])
</script>



<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>