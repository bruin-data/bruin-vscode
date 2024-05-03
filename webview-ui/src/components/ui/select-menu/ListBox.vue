<template>
  <div>
    <select
      id="query-types"
      name="query-types"
      class="form-select mt-2 p-4 block w-full rounded-lg bg-white border border-gray-200 py-2 pr-10 text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
    >
      <option v-for="option in options" :value="option" :key="option">{{ option }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
const options = ["Table", "Asset Type 2", "Asset Type 3"];
</script>

<style>
  
</style>