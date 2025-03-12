<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <vscode-panel-view
      v-for="(tab, index) in tabs"
      :key="`view-${index}`"
      :id="`view-${index}`"
      v-show="activeTab === index"
    >
      <component
        v-if="tab.props"
        :is="tab.component"
        v-bind="tab.props"
        @resetData="clearQueryOutput"
        class="flex w-full"
      />
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, onMounted, watch, triggerRef } from "vue";
import { updateValue } from "./utilities/helper";
import QueryPreview from "@/components/query-output/QueryPreview.vue";

/**
 * QueryPreview Component
 *
 * This component serves as the main application for displaying query output data.
 * It handles communication with the VSCode extension, manages the state of
 * query output, and renders the table component.
 */

const QueryOutput = ref(); // Holds the lineage data received from the extension
const QueryError = ref(); // Holds any errors related to lineage data
const activeTab = ref(0); // Tracks the currently active tab

/**
 * Handles incoming messages from the VSCode extension.
 *
 * @param {MessageEvent} event - The message event containing data from the extension.
 */

const isLoading = ref(false); // Create a direct ref instead of computed
const initEnvironment = ref();
const currentEnvironment = ref();
const handleMessage = (event) => {
  const message = event.data;
  switch (message.command) {
    case "query-output-message":
      if (message.payload.status === "loading") {
        isLoading.value = message.payload.message; // true or false
      } else {
        QueryOutput.value = updateValue(message, "success");
        triggerRef(QueryOutput);
        console.log("QueryOutput.value inside message handler", QueryOutput.value);
        QueryError.value = updateValue(message, "error");
      }
      break;
    case "init-environment":
      const payload = updateValue(message, "success").payload;
      initEnvironment.value = JSON.parse(payload);
      currentEnvironment.value = initEnvironment.value?.selected_environment;
      break;
    case "set-environment":
    currentEnvironment.value = updateValue(message, "success");
      console.log("Setting environment", currentEnvironment.value);
      break;
  }
};

const selectedEnvironment = computed(() => {
  if(!currentEnvironment.value) return "";
  const selected = currentEnvironment.value;
  return selected || "";
});
const output = computed(() => {
  console.log("QueryOutput.value in output", QueryOutput.value);
  if (!QueryOutput.value) return null;
  try {
    return typeof QueryOutput.value === "string"
      ? JSON.parse(QueryOutput.value)
      : QueryOutput.value;
  } catch (e) {
    console.error("Error parsing output:", e);
    return null;
  }
});

const errorValue = computed(() => {
  if (!QueryError.value) return null;
  try {
    return typeof QueryError.value === "string" ? JSON.parse(QueryError.value) : QueryError.value;
  } catch (e) {
    console.error("Error parsing error output:", e);
    return null;
  }
});

const clearQueryOutput = () => {
  QueryOutput.value = null;
  QueryError.value = null;
  isLoading.value = false;
};
// Define tabs for the application
const tabs = ref([
  {
    label: "QueryPreview",
    component: QueryPreview,
    props: computed(() => ({
      output: output.value,
      error: errorValue.value,
      isLoading: isLoading.value,
      environment: selectedEnvironment.value,
    })),
  },
]);

watch(output, (newValue) => {
  if (newValue) {
    console.log("output changed", newValue);
  }
});

onMounted(() => {
  window.addEventListener("message", handleMessage);
});
onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});
</script>
<style scoped>
vscode-panel-view {
  padding: 0px !important;
}
</style>

<style>
body {
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
</style>
