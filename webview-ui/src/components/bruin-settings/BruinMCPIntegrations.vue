<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg">
    <div class="p-4 sm:p-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-editor-fg">Bruin MCP Integrations</h3>
        <div class="flex items-center gap-1">
          <vscode-button
            appearance="icon"
            @click="openBruinMcpDocs"
            title="Open Bruin MCP docs"
            class="text-md font-semibold"
          >
            <span class="codicon codicon-book"></span>
          </vscode-button>
          <vscode-button
            appearance="icon"
            @click="refreshMcpStatuses"
            title="Refresh MCP integration status"
            class="text-md font-semibold"
          >
            <span class="codicon codicon-refresh"></span>
          </vscode-button>
        </div>
      </div>

      <p class="text-sm text-editor-fg mt-1">
        Configure Bruin MCP for supported clients and monitor configuration status.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <div
          v-for="integration in mcpIntegrations"
          :key="integration.id"
          role="button"
          tabindex="0"
          class="rounded border p-3 min-w-[170px] cursor-pointer select-none transition-colors"
          :class="mcpIntegrationCardClass(integration.id, integration.status)"
          @click="toggleMcpIntegration(integration.id, integration.status.configured)"
          @keydown.enter.prevent="toggleMcpIntegration(integration.id, integration.status.configured)"
          @keydown.space.prevent="toggleMcpIntegration(integration.id, integration.status.configured)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex items-center gap-2">
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
                :class="mcpPowerButtonClass(integration.id, integration.status)"
              >
                <span class="text-sm leading-none" aria-hidden="true">⏻</span>
              </span>
              <div class="text-sm font-medium text-editor-fg">{{ integration.label }}</div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <vscode-button
                appearance="icon"
                @click.stop="toggleInfo(integration.id)"
                :title="infoExpanded[integration.id] ? 'Hide details' : 'Show details'"
              >
                <span class="codicon codicon-info"></span>
              </vscode-button>
            </div>
          </div>

          <div v-if="infoExpanded[integration.id]" class="mt-2">
            <div class="text-xs text-editor-fg opacity-80">{{ integration.description }}</div>
            <div class="text-xs text-editor-fg opacity-80 mt-1">
              {{ integration.status.details }}
            </div>
            <div v-if="integration.status.configPath" class="text-xs text-editor-fg opacity-60 mt-1 font-mono">
              {{ integration.status.configPath }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="mcpFeedbackMessage"
        class="mt-3 rounded border px-3 py-2 flex items-start justify-between gap-2"
        :class="mcpFeedbackContainerClass"
      >
        <div class="text-sm" :class="mcpFeedbackClass">{{ mcpFeedbackMessage }}</div>
        <vscode-button appearance="icon" title="Dismiss message" @click="dismissMcpFeedback">
          <span class="codicon codicon-close"></span>
        </vscode-button>
      </div>

      <div
        v-for="statusAlert in mcpStatusAlerts"
        :key="statusAlert.key"
        class="mt-2 rounded border px-3 py-2 flex items-start justify-between gap-2"
        :class="statusAlert.className"
      >
        <div class="text-sm text-editor-fg">{{ statusAlert.message }}</div>
        <vscode-button appearance="icon" title="Dismiss status alert" @click="dismissStatusAlert(statusAlert.key)">
          <span class="codicon codicon-close"></span>
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, computed, watch } from "vue";
import { vscode } from "@/utilities/vscode";

type McpClientId = "vscode" | "cursor" | "codex" | "claude";
type McpIntegrationStatusType =
  | "checking"
  | "ready"
  | "not_configured"
  | "client_missing"
  | "bruin_missing"
  | "error";

interface McpIntegrationStatus {
  id: McpClientId;
  label: string;
  status: McpIntegrationStatusType;
  configured: boolean;
  clientAvailable: boolean;
  bruinAvailable: boolean;
  configPath: string | null;
  details: string;
}

const props = withDefaults(
  defineProps<{
    allowInitialLoad?: boolean;
  }>(),
  {
    allowInitialLoad: true,
  }
);

const togglingMcpTarget = ref<McpClientId | null>(null);
const mcpFeedbackMessage = ref("");
const mcpFeedbackType = ref<"success" | "error" | "">("");
const infoExpanded = ref<Record<McpClientId, boolean>>({
  vscode: false,
  cursor: false,
  codex: false,
  claude: false,
});
const bruinMcpDocsUrl = "https://getbruin.com/docs/bruin/getting-started/bruin-mcp.html";

const defaultMcpStatus: Record<McpClientId, McpIntegrationStatus> = {
  vscode: {
    id: "vscode",
    label: "VS Code",
    status: "checking",
    configured: false,
    clientAvailable: true,
    bruinAvailable: false,
    configPath: null,
    details: "Checking configuration...",
  },
  cursor: {
    id: "cursor",
    label: "Cursor",
    status: "checking",
    configured: false,
    clientAvailable: true,
    bruinAvailable: false,
    configPath: null,
    details: "Checking configuration...",
  },
  codex: {
    id: "codex",
    label: "Codex CLI",
    status: "checking",
    configured: false,
    clientAvailable: true,
    bruinAvailable: false,
    configPath: null,
    details: "Checking configuration...",
  },
  claude: {
    id: "claude",
    label: "Claude Code",
    status: "checking",
    configured: false,
    clientAvailable: true,
    bruinAvailable: false,
    configPath: null,
    details: "Checking configuration...",
  },
};

const mcpStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>({ ...defaultMcpStatus });
const hasRequestedInitialStatuses = ref(false);
const dismissedStatusAlerts = ref<Record<string, boolean>>({});
const mcpIntegrationMetadata: Array<{
  id: McpClientId;
  label: string;
  description: string;
}> = [
  {
    id: "vscode",
    label: "VS Code",
    description: "Writes global user config to VS Code mcp.json",
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "Writes global user config to ~/.cursor/mcp.json",
  },
  {
    id: "codex",
    label: "Codex CLI",
    description: "Runs codex CLI MCP registration for Bruin",
  },
  {
    id: "claude",
    label: "Claude Code",
    description: "Runs claude CLI MCP registration for Bruin in global user scope",
  },
];

const mcpIntegrations = computed(() =>
  mcpIntegrationMetadata.map((integration) => ({
    ...integration,
    status: mcpStatusByClient.value[integration.id] ?? defaultMcpStatus[integration.id],
  }))
);

const mcpFeedbackClass = computed(() => {
  if (mcpFeedbackType.value === "error") {
    return "text-errorForeground";
  }
  if (mcpFeedbackType.value === "success") {
    return "text-green-300";
  }
  return "text-editor-fg";
});

const mcpFeedbackContainerClass = computed(() => {
  if (mcpFeedbackType.value === "error") {
    return "bg-red-500/10 border-red-500/40";
  }
  if (mcpFeedbackType.value === "success") {
    return "bg-green-500/10 border-green-500/40";
  }
  return "bg-input-background border-commandCenter-border";
});

function mcpProblemStatusLabel(status: McpIntegrationStatusType): string | null {
  switch (status) {
    case "client_missing":
      return "Client missing";
    case "bruin_missing":
      return "Bruin missing";
    case "error":
      return "Error";
    default:
      return null;
  }
}

function mcpProblemStatusClass(status: McpIntegrationStatusType): string {
  switch (status) {
    case "client_missing":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/40";
    case "bruin_missing":
      return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "error":
      return "bg-red-500/15 text-red-300 border-red-500/40";
    default:
      return "bg-input-background text-editor-fg border-commandCenter-border";
  }
}

const mcpStatusAlerts = computed(() =>
  mcpIntegrations.value
    .map((integration) => {
      const problemLabel = mcpProblemStatusLabel(integration.status.status);
      if (!problemLabel) {
        return null;
      }

      const key = `${integration.id}:${integration.status.status}:${integration.status.details}`;
      if (dismissedStatusAlerts.value[key]) {
        return null;
      }

      return {
        key,
        className: mcpProblemStatusClass(integration.status.status),
        message: `${integration.label} - ${problemLabel}: ${integration.status.details}`,
      };
    })
    .filter((item): item is { key: string; className: string; message: string } => Boolean(item))
);

function handleMessage(event: MessageEvent) {
  const message = event.data;
  switch (message.command) {
    case "mcp-integration-status-message":
      if (message.payload?.status === "success" && Array.isArray(message.payload?.message)) {
        const updatedStatuses = { ...mcpStatusByClient.value };
        message.payload.message.forEach((statusItem: McpIntegrationStatus) => {
          if (statusItem?.id) {
            updatedStatuses[statusItem.id] = statusItem;
          }
        });
        mcpStatusByClient.value = updatedStatuses;
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to load MCP statuses.";
      }
      break;

    case "mcp-integration-install-message":
      togglingMcpTarget.value = null;
      if (message.payload?.status === "success") {
        mcpFeedbackType.value = "success";
        mcpFeedbackMessage.value = message.payload?.message || "MCP integration updated.";
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to update MCP integration.";
      }
      break;
  }
}

function refreshMcpStatuses() {
  mcpStatusByClient.value = {
    ...defaultMcpStatus,
  };
  vscode.postMessage({ command: "bruin.getMcpIntegrationStatus" });
}

function requestInitialStatusesIfAllowed() {
  if (!props.allowInitialLoad || hasRequestedInitialStatuses.value) {
    return;
  }

  hasRequestedInitialStatuses.value = true;
  refreshMcpStatuses();
}

function toggleMcpIntegration(target: McpClientId, currentlyConfigured: boolean) {
  if (togglingMcpTarget.value) {
    return;
  }

  togglingMcpTarget.value = target;
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
  vscode.postMessage({
    command: currentlyConfigured ? "bruin.uninstallMcpIntegration" : "bruin.installMcpIntegration",
    payload: { target },
  });
}

function toggleInfo(target: McpClientId) {
  infoExpanded.value[target] = !infoExpanded.value[target];
}

function openBruinMcpDocs() {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: bruinMcpDocsUrl,
  });
}

function dismissMcpFeedback() {
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
}

function dismissStatusAlert(key: string) {
  dismissedStatusAlerts.value[key] = true;
}

function mcpIntegrationCardClass(id: McpClientId, status: McpIntegrationStatus): string {
  if (togglingMcpTarget.value === id) {
    return "bg-input-background border-commandCenter-border opacity-70";
  }

  switch (status.status) {
    case "checking":
      return "bg-blue-500/10 border-blue-500/40";
    case "ready":
      return "bg-green-500/10 border-green-500/40";
    case "client_missing":
      return "bg-yellow-500/10 border-yellow-500/40";
    case "bruin_missing":
      return "bg-orange-500/10 border-orange-500/40";
    case "error":
      return "bg-red-500/10 border-red-500/40";
    case "not_configured":
    default:
      return "bg-input-background border-commandCenter-border";
  }
}

function mcpPowerButtonClass(id: McpClientId, status: McpIntegrationStatus): string {
  if (togglingMcpTarget.value === id) {
    return "border-commandCenter-border bg-input-background opacity-70";
  }

  switch (status.status) {
    case "checking":
      return "border-blue-500/60 bg-blue-500/20 text-blue-300";
    case "ready":
      return "border-green-500/60 bg-green-500/20 text-green-300";
    case "client_missing":
      return "border-yellow-500/60 bg-yellow-500/20 text-yellow-300";
    case "bruin_missing":
      return "border-orange-500/60 bg-orange-500/20 text-orange-300";
    case "error":
      return "border-red-500/60 bg-red-500/20 text-red-300";
    case "not_configured":
    default:
      return "border-commandCenter-border bg-input-background text-editor-fg opacity-80";
  }
}

onMounted(() => {
  window.addEventListener("message", handleMessage);
  requestInitialStatusesIfAllowed();
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});

watch(
  () => props.allowInitialLoad,
  (isAllowed) => {
    if (isAllowed) {
      requestInitialStatusesIfAllowed();
    }
  }
);
</script>
