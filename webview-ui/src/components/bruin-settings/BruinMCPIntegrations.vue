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
        Configure Bruin MCP for supported AI clients.
      </p>

      <div class="mt-3 space-y-1.5">
        <div
          v-for="integration in mcpIntegrations"
          :key="integration.id"
          class="rounded border border-commandCenter-border px-3 py-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs text-editor-fg truncate">{{ integration.label }}</span>
              <span
                class="status-badge"
                :class="MCP_STATUS_CONFIG[integration.status.status]?.statusClass"
              >
                {{ MCP_STATUS_CONFIG[integration.status.status]?.label ?? "Unknown" }}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <span
                v-if="getTooltip(integration)"
                class="info-icon codicon codicon-info"
                :title="getTooltip(integration)"
              ></span>
              <vscode-button
                appearance="secondary"
                class="mcp-config-btn"
                @click="configureMcpIntegration(integration.id)"
                :disabled="installingMcpTarget === integration.id"
              >
                {{
                  installingMcpTarget === integration.id
                    ? "..."
                    : integration.status.configured
                      ? "Reconfigure"
                      : "Configure"
                }}
              </vscode-button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="mcpFeedbackMessage"
        class="mt-2 rounded border px-1.5 py-1 flex items-center justify-between gap-1"
        :class="mcpFeedbackContainerClass"
      >
        <span class="text-3xs" :class="mcpFeedbackClass">{{ mcpFeedbackMessage }}</span>
        <vscode-button appearance="icon" title="Dismiss" @click="dismissMcpFeedback" class="feedback-close-btn">
          <span class="codicon codicon-close"></span>
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, computed } from "vue";
import { vscode } from "@/utilities/vscode";
import type { McpClientId, McpIntegrationStatus } from "@/types";
import {
  BRUIN_MCP_DOCS_URL,
  DEFAULT_MCP_STATUS,
  MCP_INTEGRATION_METADATA,
  MCP_STATUS_CONFIG,
} from "@/constants";

const installingMcpTarget = ref<McpClientId | null>(null);
const mcpFeedbackMessage = ref("");
const mcpFeedbackType = ref<"success" | "error" | "">("");

const mcpStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>({ ...DEFAULT_MCP_STATUS });

const mcpIntegrations = computed(() =>
  MCP_INTEGRATION_METADATA.map((integration) => ({
    ...integration,
    status: mcpStatusByClient.value[integration.id] ?? DEFAULT_MCP_STATUS[integration.id],
  }))
);

const mcpFeedbackClass = computed(() => {
  if (mcpFeedbackType.value === "error") {
    return "feedback-error";
  }
  if (mcpFeedbackType.value === "success") {
    return "feedback-success";
  }
  return "text-editor-fg";
});

const mcpFeedbackContainerClass = computed(() => {
  if (mcpFeedbackType.value === "error") {
    return "feedback-container-error";
  }
  if (mcpFeedbackType.value === "success") {
    return "feedback-container-success";
  }
  return "border-commandCenter-border";
});

function getTooltip(integration: { status: McpIntegrationStatus }) {
  if (integration.status.configPath) {
    return integration.status.configPath;
  }
  return integration.status.details || "";
}

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
      installingMcpTarget.value = null;
      if (message.payload?.status === "success") {
        mcpFeedbackType.value = "success";
        mcpFeedbackMessage.value = message.payload?.message || "MCP integration configured.";
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to configure MCP integration.";
      }
      break;
  }
}

function refreshMcpStatuses() {
  mcpStatusByClient.value = {
    ...DEFAULT_MCP_STATUS,
  };
  vscode.postMessage({ command: "bruin.getMcpIntegrationStatus" });
}

function configureMcpIntegration(target: McpClientId) {
  installingMcpTarget.value = target;
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
  vscode.postMessage({
    command: "bruin.installMcpIntegration",
    payload: { target },
  });
}

function openBruinMcpDocs() {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: BRUIN_MCP_DOCS_URL,
  });
}

function dismissMcpFeedback() {
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
}

onMounted(() => {
  refreshMcpStatuses();
  window.addEventListener("message", handleMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style scoped>
.status-badge {
  @apply inline-flex items-center px-1.5 py-px rounded-sm text-3xs font-medium whitespace-nowrap border;
}

.status-checking {
  @apply bg-status-info-bg text-status-info-fg border-status-info-border;
}

.status-ready {
  @apply bg-status-success-bg text-status-success-fg border-status-success-border;
}

.status-default {
  @apply bg-input-background text-input-foreground border-commandCenter-border;
}

.status-warning {
  @apply bg-status-warning-bg text-status-warning-fg border-status-warning-border;
}

.status-error {
  @apply bg-status-error-bg text-status-error-fg border-status-error-border;
}

.feedback-success {
  @apply text-status-success-fg;
}

.feedback-error {
  @apply text-status-error-fg;
}

.feedback-container-success {
  @apply border-status-success-border bg-transparent;
}

.feedback-container-error {
  @apply border-status-error-border bg-transparent;
}

.feedback-close-btn {
  padding: 0;
  min-width: auto;
  height: auto;
}

.feedback-close-btn::part(control) {
  padding: 2px;
  min-width: auto;
}

.info-icon {
  font-size: 10px;
  opacity: 0.4;
  cursor: help;
}

.info-icon:hover {
  opacity: 0.7;
}

/* Fixed width button for consistent sizing */
.mcp-config-btn {
  min-width: 80px;
  text-align: center;
}

.mcp-config-btn::part(control) {
  min-width: 80px;
  justify-content: center;
  padding: 2px 8px;
  font-size: 11px;
}
</style>
