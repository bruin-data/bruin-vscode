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
            @click="refreshAllMcpStatuses"
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

      <!-- Bruin Local MCP Section -->
      <div class="mt-3">
        <button
          type="button"
          class="section-header"
          @click="localSectionExpanded = !localSectionExpanded"
        >
          <span class="codicon" :class="localSectionExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
          <span class="text-xs font-medium text-editor-fg">Bruin MCP (Local)</span>
        </button>

        <div v-if="localSectionExpanded" class="mt-1.5 space-y-1.5">
          <div
            v-for="integration in localMcpIntegrations"
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
                  @click="toggleMcpIntegration('bruin', integration.id, integration.status.configured)"
                  :disabled="togglingMcpTarget === `bruin-${integration.id}`"
                >
                  {{
                    togglingMcpTarget === `bruin-${integration.id}`
                      ? "..."
                      : integration.status.configured
                        ? "Disable"
                        : "Enable"
                  }}
                </vscode-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bruin Cloud MCP Section -->
      <div class="mt-3">
        <button
          type="button"
          class="section-header"
          @click="cloudSectionExpanded = !cloudSectionExpanded"
        >
          <span class="codicon" :class="cloudSectionExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'"></span>
          <span class="text-xs font-medium text-editor-fg">Bruin Cloud MCP</span>
        </button>

        <div v-if="cloudSectionExpanded" class="mt-1.5 space-y-1.5">
          <!-- Bearer Token Input -->
          <div class="rounded border border-commandCenter-border px-3 py-2">
            <div class="flex items-center gap-2">
              <label class="text-xs text-editor-fg whitespace-nowrap">Bearer Token:</label>
              <input
                type="password"
                v-model="cloudBearerToken"
                placeholder="Enter your Bruin Cloud API token"
                class="token-input"
                @input="onBearerTokenChange"
              />
              <vscode-button
                appearance="secondary"
                class="mcp-config-btn"
                @click="saveBearerToken"
                :disabled="isSavingToken || !cloudBearerToken.trim()"
              >
                {{ isSavingToken ? "..." : "Save" }}
              </vscode-button>
            </div>
            <p class="text-3xs text-editor-fg mt-1 opacity-60">
              Get your token from <a href="#" @click.prevent="openCloudTokenPage" class="underline">cloud.getbruin.com</a>
            </p>
          </div>

          <div
            v-for="integration in cloudMcpIntegrations"
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
                  @click="toggleMcpIntegration('cloud', integration.id, integration.status.configured)"
                  :disabled="togglingMcpTarget === `cloud-${integration.id}` || !hasCloudBearerToken"
                  :title="!hasCloudBearerToken ? 'Save bearer token first' : ''"
                >
                  {{
                    togglingMcpTarget === `cloud-${integration.id}`
                      ? "..."
                      : integration.status.configured
                        ? "Disable"
                        : "Enable"
                  }}
                </vscode-button>
              </div>
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
import { ref, onBeforeUnmount, onMounted, computed, watch } from "vue";
import { vscode } from "@/utilities/vscode";
import type { McpClientId, McpIntegrationStatus, McpVariant } from "@/types";
import {
  BRUIN_MCP_DOCS_URL,
  DEFAULT_MCP_STATUS,
  DEFAULT_CLOUD_MCP_STATUS,
  MCP_INTEGRATION_METADATA,
  CLOUD_MCP_INTEGRATION_METADATA,
  MCP_STATUS_CONFIG,
} from "@/constants";

const props = withDefaults(
  defineProps<{
    allowInitialLoad?: boolean;
  }>(),
  {
    allowInitialLoad: true,
  }
);

const togglingMcpTarget = ref<string | null>(null);
const mcpFeedbackMessage = ref("");
const mcpFeedbackType = ref<"success" | "error" | "">("");

const localMcpStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>({ ...DEFAULT_MCP_STATUS });
const cloudMcpStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>({ ...DEFAULT_CLOUD_MCP_STATUS });
const hasRequestedInitialStatuses = ref(false);

const localSectionExpanded = ref(true);
const cloudSectionExpanded = ref(false);

const cloudBearerToken = ref("");
const hasCloudBearerToken = ref(false);
const isSavingToken = ref(false);

const localMcpIntegrations = computed(() =>
  MCP_INTEGRATION_METADATA.map((integration) => ({
    ...integration,
    status: localMcpStatusByClient.value[integration.id] ?? DEFAULT_MCP_STATUS[integration.id],
  }))
);

const cloudMcpIntegrations = computed(() =>
  CLOUD_MCP_INTEGRATION_METADATA.map((integration) => ({
    ...integration,
    status: cloudMcpStatusByClient.value[integration.id] ?? DEFAULT_CLOUD_MCP_STATUS[integration.id],
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
    case "mcp-integration-status-message": {
      const variant = message.payload?.variant as McpVariant | undefined;
      if (message.payload?.status === "success" && Array.isArray(message.payload?.message)) {
        const statusMap = variant === "cloud" ? cloudMcpStatusByClient : localMcpStatusByClient;
        const updatedStatuses = { ...statusMap.value };
        message.payload.message.forEach((statusItem: McpIntegrationStatus) => {
          if (statusItem?.id) {
            updatedStatuses[statusItem.id] = statusItem;
          }
        });
        statusMap.value = updatedStatuses;
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to load MCP statuses.";
      }
      break;
    }

    case "mcp-integration-install-message":
      togglingMcpTarget.value = null;
      if (message.payload?.status === "success") {
        mcpFeedbackType.value = "success";
        mcpFeedbackMessage.value = message.payload?.message || "MCP integration enabled.";
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to enable MCP integration.";
      }
      break;

    case "mcp-integration-uninstall-message":
      togglingMcpTarget.value = null;
      if (message.payload?.status === "success") {
        mcpFeedbackType.value = "success";
        mcpFeedbackMessage.value = message.payload?.message || "MCP integration disabled.";
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to disable MCP integration.";
      }
      break;

    case "mcp-cloud-bearer-token-message":
      if (message.payload?.status === "success") {
        const hasToken = !!message.payload?.token;
        hasCloudBearerToken.value = hasToken;
        if (hasToken) {
          cloudBearerToken.value = "••••••••••••••••";
        }
      }
      break;

    case "mcp-cloud-bearer-token-saved-message":
      isSavingToken.value = false;
      if (message.payload?.status === "success") {
        hasCloudBearerToken.value = true;
        cloudBearerToken.value = "••••••••••••••••";
        mcpFeedbackType.value = "success";
        mcpFeedbackMessage.value = "Bearer token saved.";
      } else {
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to save bearer token.";
      }
      break;
  }
}

function refreshAllMcpStatuses() {
  localMcpStatusByClient.value = { ...DEFAULT_MCP_STATUS };
  cloudMcpStatusByClient.value = { ...DEFAULT_CLOUD_MCP_STATUS };
  vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "bruin" } });
  vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "cloud" } });
}

function requestInitialStatusesIfAllowed() {
  if (!props.allowInitialLoad || hasRequestedInitialStatuses.value) {
    return;
  }
  hasRequestedInitialStatuses.value = true;
  refreshAllMcpStatuses();
  vscode.postMessage({ command: "bruin.getMcpCloudBearerToken" });
}

function toggleMcpIntegration(variant: McpVariant, target: McpClientId, isConfigured: boolean) {
  togglingMcpTarget.value = `${variant}-${target}`;
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
  vscode.postMessage({
    command: isConfigured ? "bruin.uninstallMcpIntegration" : "bruin.installMcpIntegration",
    payload: { target, variant },
  });
}

function openBruinMcpDocs() {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: BRUIN_MCP_DOCS_URL,
  });
}

function openCloudTokenPage() {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: "https://cloud.getbruin.com/settings/api-tokens",
  });
}

function saveBearerToken() {
  if (!cloudBearerToken.value.trim() || cloudBearerToken.value === "••••••••••••••••") {
    return;
  }
  isSavingToken.value = true;
  vscode.postMessage({
    command: "bruin.saveMcpCloudBearerToken",
    payload: { token: cloudBearerToken.value.trim() },
  });
}

function onBearerTokenChange() {
  if (cloudBearerToken.value !== "••••••••••••••••") {
    hasCloudBearerToken.value = false;
  }
}

function dismissMcpFeedback() {
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
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

<style scoped>
.section-header {
  @apply flex items-center gap-1 w-full text-left bg-transparent border-none cursor-pointer p-0;
}

.section-header:hover {
  @apply opacity-80;
}

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

.token-input {
  @apply flex-1 bg-input-background text-input-foreground border border-commandCenter-border rounded px-2 py-1 text-xs;
}

.token-input::placeholder {
  @apply text-input-foreground opacity-50;
}

.token-input:focus {
  @apply outline-none border-inputOption-activeBorder;
}
</style>
