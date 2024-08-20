<template>
  <div class="flex flex-col justify-between">
    <div>
      <BruinCLI />
    </div>
    <div class="mt-2" v-if="props.isBruinInstalled">
      <ConnectionsList />
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
