<template>
      <span :class="props.className">
        {{ props.value }}
      </span>
</template>

<script setup lang="ts">
import { defineProps } from "vue";

const props = defineProps<{
  title?: string;
  value: string;
  className?: string;
}>();
</script>
