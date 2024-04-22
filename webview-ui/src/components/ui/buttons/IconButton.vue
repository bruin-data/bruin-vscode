<template>
  <button type="button" @click="$emit('click')">
    <Clipboard size="20" id="clipboard" aria-hidden="true" />
  </button>
</template>
<script setup>
import { Clipboard } from "lucide-vue-next";
</script>
<style>
#clipboard {
  color: var(--vscode-input-placeholderForeground);
}
</style>
