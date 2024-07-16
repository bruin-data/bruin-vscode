<template>
  <div class="flex flex-col p-4 space-y-4">
    <div v-if="lineageSuccess" class="lineage-container flex flex-col space-y-2">
      <h1 class="lineage-title mb-4 text-xl font-bold leading-none tracking-tight">
        Lineage: '{{ formattedLineage.name }}'
      </h1>
      <LineageSection title="Upstream Dependencies" :dependencies="upstreams" />
      <LineageSection title="Downstream Dependencies" :dependencies="formattedLineage.downstream" />
      <TotalSection :total="totalDependencies" />
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
import { ref, watch, computed } from "vue";

const { formattedLineage, lineageError, lineageSuccess } = useLineage();

const lineageData = ref(formattedLineage.value);

const upstreams = ref(lineageData.value?.upstreams || []);

watch(
  formattedLineage,
  (newLineage) => {
    lineageData.value = newLineage;
    upstreams.value = newLineage?.upstreams || [];
  },
  { deep: true }
);

const totalDependencies = computed(() => {
  const downstreamLength = lineageData.value?.downstream?.length || 0;
  const upstreamsLength = upstreams.value.length;
  return downstreamLength + upstreamsLength;
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
