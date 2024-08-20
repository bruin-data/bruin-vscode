<template>
  <div class="flex flex-col justify-between">
    <div>
      <BruinCLI />
    </div>
    <div class="mt-2">
      <ConnectionsList />
    </div>
  </div>
</template>

<script setup>
import BruinCLI from "@/components/bruin-settings/BruinCLI.vue";
import ConnectionsList from "@/components/connections/ConnectionList.vue";
</script>
