<template>
  <div class="flex flex-col space-y-6">
    <!-- Bruin CLI Section -->
    <div class="bg-editorWidget-bg shadow sm:rounded-lg p-6">
      <BruinCLI />
    </div>

    <!-- Connections Section -->
    <div class="bg-editorWidget-bg shadow sm:rounded-lg">
      <ConnectionsList v-if="props.isBruinInstalled" />
    </div>
  </div>
</template>

<script setup>
import BruinCLI from "@/components/bruin-settings/BruinCLI.vue";
import ConnectionsList from "@/components/connections/ConnectionList.vue";
import { defineProps } from "vue";

const props = defineProps({
  isBruinInstalled: Boolean,
});


</script>
