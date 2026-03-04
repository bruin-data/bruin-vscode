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

      <!-- Tabs -->
      <div class="mt-3 flex border-b border-commandCenter-border">
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-medium text-editor-fg border-b-2 -mb-px bg-transparent cursor-pointer hover:opacity-80"
          :class="activeTab === 'bruin' ? 'border-editor-fg' : 'border-transparent'"
          @click="activeTab = 'bruin'"
        >
          Local
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-medium text-editor-fg border-b-2 -mb-px bg-transparent cursor-pointer hover:opacity-80"
          :class="activeTab === 'cloud' ? 'border-editor-fg' : 'border-transparent'"
          @click="activeTab = 'cloud'"
        >
          Cloud
        </button>
      </div>

      <!-- Cloud Bearer Token (only shown for cloud tab) -->
      <div v-if="activeTab === 'cloud'" class="mt-2 rounded border border-commandCenter-border px-2 py-1.5">
        <div class="flex items-center gap-1.5">
          <!-- Token exists -->
          <template v-if="hasCloudBearerToken">
            <span class="text-3xs text-status-success-fg flex items-center gap-1">
              <span class="codicon codicon-check"></span>
              Token saved
            </span>
            <vscode-button
              appearance="secondary"
              class="mcp-btn"
              @click="clearBearerToken"
              :disabled="isClearingToken"
            >
              {{ isClearingToken ? "..." : "Clear" }}
            </vscode-button>
          </template>
          <!-- No token -->
          <template v-else>
            <label class="text-3xs text-editor-fg whitespace-nowrap">Token:</label>
            <input
              type="password"
              v-model="cloudBearerToken"
              placeholder="API token"
              class="flex-1 min-w-0 bg-input-background text-input-foreground border border-commandCenter-border rounded text-3xs px-1.5 py-0.5 h-[22px] box-border outline-none focus:border-inputOption-activeBorder"
            />
            <vscode-button
              appearance="secondary"
              class="mcp-btn"
              @click="saveBearerToken"
              :disabled="isSavingToken || !cloudBearerToken.trim()"
            >
              {{ isSavingToken ? "..." : "Save" }}
            </vscode-button>
            <a href="#" @click.prevent="openCloudTokenPage" class="text-3xs underline opacity-60 whitespace-nowrap" title="Get token from cloud.getbruin.com">Get token</a>
          </template>
        </div>
      </div>

      <!-- Integration List -->
      <div class="mt-2 space-y-1.5">
        <div
          v-for="integration in currentIntegrations"
          :key="integration.id"
          class="rounded border border-commandCenter-border px-3 py-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs text-editor-fg truncate">{{ integration.label }}</span>
              <span
                class="inline-flex items-center px-1.5 py-px rounded-sm text-3xs font-medium whitespace-nowrap border"
                :class="getStatusClass(integration.status.status)"
              >
                {{ MCP_STATUS_CONFIG[integration.status.status]?.label ?? "Unknown" }}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <span
                v-if="getTooltip(integration)"
                class="codicon codicon-info text-[10px] opacity-40 cursor-help hover:opacity-70"
                :title="getTooltip(integration)"
              ></span>
              <vscode-button
                appearance="secondary"
                class="mcp-btn"
                @click="toggleMcpIntegration(integration.id, integration.status.configured)"
                :disabled="isButtonDisabled(integration.id)"
                :title="getButtonTitle()"
              >
                {{ getButtonLabel(integration.id, integration.status.configured) }}
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
        <vscode-button appearance="icon" title="Dismiss" @click="dismissMcpFeedback" class="p-0 min-w-0 h-auto">
          <span class="codicon codicon-close"></span>
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, computed, watch } from "vue";
import { vscode } from "@/utilities/vscode";
import type { McpClientId, McpIntegrationStatus, McpVariant, McpIntegrationStatusType } from "@/types";
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

const activeTab = ref<McpVariant>("bruin");
const togglingMcpTarget = ref<string | null>(null);
const mcpFeedbackMessage = ref("");
const mcpFeedbackType = ref<"success" | "error" | "">("");
let feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

function showFeedback(type: "success" | "error", message: string) {
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  mcpFeedbackType.value = type;
  mcpFeedbackMessage.value = message;
  feedbackTimeout = setTimeout(dismissMcpFeedback, 4000);
}

const localMcpStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>({ ...DEFAULT_MCP_STATUS });
const cloudMcpStatusByClient = ref<Partial<Record<McpClientId, McpIntegrationStatus>>>({ ...DEFAULT_CLOUD_MCP_STATUS });
const hasRequestedInitialStatuses = ref(false);

const cloudBearerToken = ref("");
const hasCloudBearerToken = ref(false);
const isSavingToken = ref(false);
const isClearingToken = ref(false);

const STATUS_CLASSES: Record<McpIntegrationStatusType, string> = {
  checking: "bg-status-info-bg text-status-info-fg border-status-info-border",
  ready: "bg-status-success-bg text-status-success-fg border-status-success-border",
  not_configured: "bg-input-background text-input-foreground border-commandCenter-border",
  client_missing: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  bruin_missing: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  error: "bg-status-error-bg text-status-error-fg border-status-error-border",
};

function getStatusClass(status: McpIntegrationStatusType): string {
  return STATUS_CLASSES[status] || STATUS_CLASSES.not_configured;
}

const currentIntegrations = computed(() => {
  const metadata = activeTab.value === "cloud" ? CLOUD_MCP_INTEGRATION_METADATA : MCP_INTEGRATION_METADATA;
  const statusMap = activeTab.value === "cloud" ? cloudMcpStatusByClient.value : localMcpStatusByClient.value;
  const defaults = activeTab.value === "cloud" ? DEFAULT_CLOUD_MCP_STATUS : DEFAULT_MCP_STATUS;

  return metadata.map((integration) => ({
    ...integration,
    status: statusMap[integration.id] ?? defaults[integration.id] as McpIntegrationStatus,
  }));
});

const mcpFeedbackClass = computed(() => {
  if (mcpFeedbackType.value === "error") return "text-status-error-fg";
  if (mcpFeedbackType.value === "success") return "text-status-success-fg";
  return "text-editor-fg";
});

const mcpFeedbackContainerClass = computed(() => {
  if (mcpFeedbackType.value === "error") return "border-status-error-border bg-transparent";
  if (mcpFeedbackType.value === "success") return "border-status-success-border bg-transparent";
  return "border-commandCenter-border";
});

function getTooltip(integration: { status: McpIntegrationStatus }) {
  if (integration.status.configPath) return integration.status.configPath;
  return integration.status.details || "";
}

function isButtonDisabled(integrationId: McpClientId): boolean {
  const targetKey = `${activeTab.value}-${integrationId}`;
  if (togglingMcpTarget.value === targetKey) return true;
  if (activeTab.value === "cloud" && !hasCloudBearerToken.value) return true;
  return false;
}

function getButtonTitle(): string {
  if (activeTab.value === "cloud" && !hasCloudBearerToken.value) {
    return "Save bearer token first";
  }
  return "";
}

function getButtonLabel(integrationId: McpClientId, isConfigured: boolean): string {
  const targetKey = `${activeTab.value}-${integrationId}`;
  if (togglingMcpTarget.value === targetKey) return "...";
  return isConfigured ? "Disable" : "Enable";
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
        showFeedback("error", message.payload?.message || "Failed to load MCP statuses.");
      }
      break;
    }

    case "mcp-integration-install-message":
      togglingMcpTarget.value = null;
      if (message.payload?.status === "success") {
        showFeedback("success", message.payload?.message || "MCP integration enabled.");
      } else {
        showFeedback("error", message.payload?.message || "Failed to enable MCP integration.");
      }
      break;

    case "mcp-integration-uninstall-message":
      togglingMcpTarget.value = null;
      if (message.payload?.status === "success") {
        showFeedback("success", message.payload?.message || "MCP integration disabled.");
      } else {
        showFeedback("error", message.payload?.message || "Failed to disable MCP integration.");
      }
      break;

    case "mcp-cloud-bearer-token-message":
      if (message.payload?.status === "success") {
        hasCloudBearerToken.value = !!message.payload?.token;
      }
      break;

    case "mcp-cloud-bearer-token-saved-message":
      isSavingToken.value = false;
      isClearingToken.value = false;
      if (message.payload?.status === "success") {
        hasCloudBearerToken.value = message.payload?.action !== "cleared";
        cloudBearerToken.value = "";
        showFeedback("success", message.payload?.action === "cleared" ? "Token cleared." : "Token saved.");
      } else {
        showFeedback("error", message.payload?.message || "Failed to save bearer token.");
      }
      break;
  }
}

function refreshMcpStatuses() {
  if (activeTab.value === "bruin") {
    localMcpStatusByClient.value = { ...DEFAULT_MCP_STATUS };
    vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "bruin" } });
  } else {
    cloudMcpStatusByClient.value = { ...DEFAULT_CLOUD_MCP_STATUS } as Partial<Record<McpClientId, McpIntegrationStatus>>;
    vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "cloud" } });
  }
}

function requestInitialStatusesIfAllowed() {
  if (!props.allowInitialLoad || hasRequestedInitialStatuses.value) return;
  hasRequestedInitialStatuses.value = true;

  localMcpStatusByClient.value = { ...DEFAULT_MCP_STATUS };
  vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "bruin" } });
  vscode.postMessage({ command: "bruin.getMcpCloudBearerToken" });
}

function toggleMcpIntegration(target: McpClientId, isConfigured: boolean) {
  togglingMcpTarget.value = `${activeTab.value}-${target}`;
  dismissMcpFeedback();
  vscode.postMessage({
    command: isConfigured ? "bruin.uninstallMcpIntegration" : "bruin.installMcpIntegration",
    payload: { target, variant: activeTab.value },
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
    payload: "https://cloud.getbruin.com/user/api-tokens",
  });
}

function saveBearerToken() {
  if (!cloudBearerToken.value.trim()) return;
  isSavingToken.value = true;
  vscode.postMessage({
    command: "bruin.saveMcpCloudBearerToken",
    payload: { token: cloudBearerToken.value.trim() },
  });
}

function clearBearerToken() {
  isClearingToken.value = true;
  vscode.postMessage({
    command: "bruin.saveMcpCloudBearerToken",
    payload: { token: "" },
  });
}

function dismissMcpFeedback() {
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
    feedbackTimeout = null;
  }
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
}

watch(activeTab, (newTab) => {
  if (newTab === "cloud") {
    cloudMcpStatusByClient.value = { ...DEFAULT_CLOUD_MCP_STATUS } as Partial<Record<McpClientId, McpIntegrationStatus>>;
    vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "cloud" } });
  } else {
    localMcpStatusByClient.value = { ...DEFAULT_MCP_STATUS };
    vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant: "bruin" } });
  }
});

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
    if (isAllowed) requestInitialStatusesIfAllowed();
  }
);
</script>

<style scoped>
/* Only keep styles that can't be done with Tailwind (::part selectors for web components) */
.mcp-btn {
  min-width: 60px;
  text-align: center;
}

.mcp-btn::part(control) {
  min-width: 60px;
  justify-content: center;
  padding: 2px 8px;
  font-size: 11px;
}
</style>
