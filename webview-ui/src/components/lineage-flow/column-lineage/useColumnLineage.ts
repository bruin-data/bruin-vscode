import { ref, onUnmounted } from "vue";
import { vscode } from "@/utilities/vscode";
import { generateGraphWithColumnData } from "@/utilities/graphGenerator";

export function useColumnLineage() {
  const columnLineageData = ref<any>(null);
  const isLoadingColumnLineage = ref(false);
  const columnLineageError = ref<string | null>(null);
  const graphData = ref<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });

  const fetchColumnLineageData = async () => {
    try {
      isLoadingColumnLineage.value = true;
      columnLineageError.value = null;
      vscode.postMessage({
        command: "bruin.getColumnLineage",
        payload: {},
      });
    } catch (error: any) {
      console.error("Error requesting column lineage:", error);
      columnLineageError.value = error.message || "Failed to fetch column lineage";
      isLoadingColumnLineage.value = false;
    }
  };

  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    if (message.command === "column-lineage-message") {
      isLoadingColumnLineage.value = false;
      if (message.payload.status === "success") {
        columnLineageData.value = message.payload.message;
        columnLineageError.value = null;
        graphData.value = generateGraphWithColumnData(columnLineageData.value);
      } else {
        columnLineageError.value = message.payload.message;
        columnLineageData.value = null;
        graphData.value = { nodes: [], edges: [] };
      }
    }
  };

  window.addEventListener("message", handleMessage);

  onUnmounted(() => {
    window.removeEventListener("message", handleMessage);
  });

  return {
    columnLineageData,
    isLoadingColumnLineage,
    columnLineageError,
    graphData,
    fetchColumnLineageData,
  };
} 