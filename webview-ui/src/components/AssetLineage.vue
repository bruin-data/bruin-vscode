<template>
  <div class="flex flex-col p-4 space-y-4">
    <div class="flex flex-col space-y-3">
      <div class="flex flex-wrap gap-y-4">
        <div v-if="lineageSuccess">
          <div class="lineage-container flex flex-col space-y-2">
            <h1 class="lineage-title mb-4 text-xl font-bold leading-none tracking-tight">Lineage: '{{ formattedLineage.name }}'</h1>
            <section class="dependencies">
              <h2 class="section-title mb-2 text-lg font-semibold">Upstream Dependencies</h2>
              <div v-if="formattedLineage.upstream.length === 0" class="no-dependencies">
                Asset has no upstream dependencies.
              </div>
              <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400" v-else>
                <li
                  v-for="dep in formattedLineage.upstream"
                  :key="dep.name"
                >
                   {{ dep.name }} 
                </li>
              </ul>
            </section>
            <section class="dependencies">
              <h2 class="section-title  mb-2 text-lg font-semibold">Downstream Dependencies</h2>
              <div v-if="formattedLineage.downstream.length === 0" class="no-dependencies">
                Asset has no downstream dependencies.
              </div>
              <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400" v-else>
                <li
                  v-for="dep in formattedLineage.downstream"
                  :key="dep.name"
                >
                   {{ dep.name }}
                </li>
              </ul>
            </section>
            <section>
              <h2 class="section-title mb-2 text-lg font-semibold">Total: <span class="text-opacity-65 text-[color:var(--vscode-editor-foreground)]  ms-3 text-lg font-medium">{{ formattedLineage.downstream.length + formattedLineage.upstream.length}}</span></h2>
            </section>
          </div>
        </div>
        <div v-if="lineageError">
          <ErrorAlert :errorMessage="lineageError" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import ErrorAlert from "@/components/ErrorAlert.vue";
import { updateValue, formatLineage } from "@/utilities/helper";

const lineageSuccess = ref("null");
const lineageError = ref(null);

onMounted(() => {
  window.addEventListener("message", receiveMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
});

function receiveMessage(event: { data: any }) {
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
      return "Invalid lineage data format.";
    }
  }
  return null;
});
</script>

<style scoped>
.lineage-container {
  background: var(--vscode-background);
  border: 1px solid var(--vscode-panel-border);
  padding: 40px;
  border-radius: 8px;
  margin-top: 20px;
}

.lineage-title {
  color: var(--vscode-forground);
  border-bottom: 2px solid #666;
}

.section-title {
  color: var(--vscode-input);
  margin: 10px 0;
}

.dependencies {
  margin-bottom: 20px;
}

.no-dependencies {
  color: #888;
}

.dependency-item {
  list-style-type: none;
  margin: 5px 0;
  padding-left: 20px;
  position: relative;
}

.dependency-item:before {
  font-size: 20px;
  position: absolute;
  left: 0;
}

a {
  color: #5c67f2; /* Link color */
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style>