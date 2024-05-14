<template>
  <div class="flex flex-col p-4 space-y-4">
    <div v-if="lineageSuccess" class="lineage-container flex flex-col space-y-2">
      <h1 class="lineage-title mb-4 text-xl font-bold leading-none tracking-tight">
        Lineage: '{{ formattedLineage.name }}'
      </h1>
      <LineageSection title="Upstream Dependencies" :dependencies="formattedLineage.upstream" />
      <LineageSection title="Downstream Dependencies" :dependencies="formattedLineage.downstream" />
      <TotalSection :total="formattedLineage.downstream.length + formattedLineage.upstream.length" />
    </div>
    <div v-if="lineageError">
      <ErrorAlert :errorMessage="lineageError" />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import ErrorAlert from "@/components/ErrorAlert.vue";
import LineageSection from "@/components/lineage-text/LineageSection.vue";
import TotalSection from "@/components/lineage-text/TotalSection.vue";
import { updateValue } from "@/utilities/helper";

const lineageSuccess = ref(null);
const lineageError = ref(null);

onMounted(() => {
  window.addEventListener("message", receiveMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
});

function receiveMessage(event) {
  if (!event) return;
  const envelope = event.data;
  switch (envelope.command) {
    case "lineage-message":
      lineageSuccess.value = updateValue(envelope, "success");
      lineageError.value = updateValue(envelope, "error");
      break;
  }
}

const formattedLineage = computed(() => {
  if (lineageSuccess.value) {
    try {
      return JSON.parse(lineageSuccess.value);
    } catch (e) {
      console.error("Error parsing lineage data:", e);
      return null;
    }
  }
  return null;
});
</script>

<style scoped>
.lineage-container {
  background: var(--vscode-background);
  border: 1px solid var(--vscode-panel-border);
  padding: 2rem 4rem 2rem 2rem;
  border-radius: 8px;
  margin-top: 20px;
}
.lineage-title {
  color: var(--vscode-foreground);
  border-bottom: 2px solid #666;
}
.section-title {
  color: var(--vscode-input);
}
</style>