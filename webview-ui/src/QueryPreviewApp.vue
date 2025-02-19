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
        :output="QueryOutput"
        class="flex w-full" 
      />
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
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
const handleMessage = (event) => {
  const message = event.data;
  switch (message.command) {
    case "query-output-message":
      QueryOutput.value = updateValue(message, "success");
      QueryError.value = updateValue(message, "error");
      console.log("data recieved for the query output", QueryOutput.value, typeof QueryOutput.value);
      break;
  }
};

// add event listener 
window.addEventListener("message", handleMessage);
const queryOutput = `id,name,email,age,city
1,John Doe,johndoe@example.com,30,New York
2,Jane Smith,janesmith@example.com,25,Los Angeles
3,Alice Johnson,alicej@example.com,28,Chicago
4,Bob Brown,bobb@example.com,35,Houston
5,Charlie Black,charlieb@example.com,22,Miami
6,Diana Prince,dianap@example.com,32,San Francisco`;

const output = computed(() => {
  if (!QueryOutput.value) return null;
  try {
    const parsed = typeof QueryOutput.value === 'string' ? JSON.parse(QueryOutput.value) : QueryOutput.value;
    console.log('Parsed output:', parsed);
    return parsed;
  } catch (e) {
    console.error('Error parsing output:', e);
    return null;
  }
});

// Define tabs for the application
const tabs = ref([
  {
    label: "QueryPreview",
    component: QueryPreview,
    props: {
      output: computed(() => output.value),
    },
  },
]);


onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});



</script>
<style>
vscode-panel-view {
  padding: 0 !important;
}
</style>
