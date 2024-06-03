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
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";
import LineageSection from "@/components/lineage-text/LineageSection.vue";
import TotalSection from "@/components/lineage-text/TotalSection.vue";
import { useLineage } from "@/composables/useLineage";

const { formattedLineage, lineageError, lineageSuccess } = useLineage();

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