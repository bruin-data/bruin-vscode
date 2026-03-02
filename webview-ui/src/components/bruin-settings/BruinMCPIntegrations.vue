<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg">
    <div class="p-4 sm:p-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-editor-fg">MCP Integrations</h3>
        <vscode-button
          appearance="icon"
          @click="refreshAllMcpStatuses"
          title="Refresh MCP integration status"
          class="text-md font-semibold"
        >
          <span class="codicon codicon-refresh"></span>
        </vscode-button>
      </div>

      <div class="mt-3 space-y-3">
        <div class="rounded border border-commandCenter-border p-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-editor-fg">Bruin MCP</h4>
            <vscode-button
              appearance="icon"
              @click="openBruinMcpDocs"
              title="Open Bruin MCP docs"
              class="text-md font-semibold"
            >
              <span class="codicon codicon-book"></span>
            </vscode-button>
          </div>

          <div class="mt-2 grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(145px, 1fr))">
            <div
              v-for="integration in bruinIntegrations"
              :key="`bruin-${integration.id}`"
              role="button"
              tabindex="0"
              class="rounded border px-2 py-1.5 cursor-pointer select-none transition-colors"
              :class="mcpIntegrationCardClass('bruin', integration.id, integration.status)"
              @click="toggleMcpIntegration('bruin', integration.id, integration.status.configured)"
              @keydown.enter.prevent="toggleMcpIntegration('bruin', integration.id, integration.status.configured)"
              @keydown.space.prevent="toggleMcpIntegration('bruin', integration.id, integration.status.configured)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex items-center gap-1.5">
                  <span
                    class="inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors"
                    :class="mcpPowerButtonClass('bruin', integration.id, integration.status)"
                  >
                    <span
                      v-if="isIntegrationLoading('bruin', integration.id, integration.status)"
                      class="codicon codicon-sync codicon-modifier-spin leading-none inline-block"
                      style="font-size: 12px;"
                      aria-hidden="true"
                    ></span>
                    <span v-else class="text-xs leading-none" aria-hidden="true">⏻</span>
                  </span>
                  <div class="text-sm font-medium text-editor-fg">{{ integration.label }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded border border-commandCenter-border p-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-editor-fg">Bruin Cloud MCP</h4>
            <vscode-button
              appearance="icon"
              @click="openBruinCloudMcpDocs"
              title="Open Bruin Cloud MCP docs"
              class="text-md font-semibold"
            >
              <span class="codicon codicon-book"></span>
            </vscode-button>
          </div>

          <div class="mt-2 flex items-center gap-2">
            <input
              v-model="cloudBearerToken"
              :readonly="!cloudTokenEditable"
              :type="cloudTokenEditable ? 'text' : 'password'"
              placeholder="Bearer token"
              class="w-full rounded border px-2 py-1.5 text-xs bg-input-background text-input-foreground border-commandCenter-border"
              :class="cloudTokenEditable ? 'opacity-100' : 'opacity-70'"
            />
            <vscode-button
              appearance="icon"
              @click="toggleCloudTokenEdit"
              :title="cloudTokenEditable ? 'Lock token' : 'Edit token'"
            >
              <span class="codicon" :class="cloudTokenEditable ? 'codicon-check' : 'codicon-edit'"></span>
            </vscode-button>
          </div>

          <div class="mt-2 grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(145px, 1fr))">
            <div
              v-for="integration in cloudIntegrations"
              :key="`cloud-${integration.id}`"
              role="button"
              :tabindex="isCloudToggleEnabled ? 0 : -1"
              class="rounded border px-2 py-1.5 cursor-pointer select-none transition-colors"
              :class="[
                mcpIntegrationCardClass('cloud', integration.id, integration.status),
                { 'cursor-not-allowed': !isCloudToggleEnabled },
              ]"
              @click="toggleMcpIntegration('cloud', integration.id, integration.status.configured)"
              @keydown.enter.prevent="toggleMcpIntegration('cloud', integration.id, integration.status.configured)"
              @keydown.space.prevent="toggleMcpIntegration('cloud', integration.id, integration.status.configured)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex items-center gap-1.5">
                  <span
                    class="inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors"
                    :class="mcpPowerButtonClass('cloud', integration.id, integration.status)"
                  >
                    <span
                      v-if="isIntegrationLoading('cloud', integration.id, integration.status)"
                      class="codicon codicon-sync codicon-modifier-spin leading-none inline-block"
                      style="font-size: 12px;"
                      aria-hidden="true"
                    ></span>
                    <span v-else class="text-xs leading-none" aria-hidden="true">⏻</span>
                  </span>
                  <div class="text-sm font-medium text-editor-fg">{{ integration.label }}</div>
                </div>
              </div>
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
type McpVariant = "bruin" | "cloud";
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

interface McpIntegrationMetadata {
  id: McpClientId;
  label: string;
}

const props = withDefaults(
  defineProps<{
    allowInitialLoad?: boolean;
  }>(),
  {
    allowInitialLoad: true,
  }
);

const bruinMcpDocsUrl = "https://getbruin.com/docs/bruin/getting-started/bruin-mcp.html";
const bruinCloudMcpDocsUrl = "https://getbruin.com/docs/bruin/cloud/mcp-setup.html";

const bruinMetadata: McpIntegrationMetadata[] = [
  { id: "vscode", label: "VS Code" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex CLI" },
  { id: "claude", label: "Claude Code" },
];

const cloudMetadata: McpIntegrationMetadata[] = [
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex CLI" },
  { id: "claude", label: "Claude Code" },
];

function createDefaultStatus(metadata: McpIntegrationMetadata): McpIntegrationStatus {
  return {
    id: metadata.id,
    label: metadata.label,
    status: "checking",
    configured: false,
    clientAvailable: true,
    bruinAvailable: false,
    configPath: null,
    details: "Checking configuration...",
  };
}

function createDefaultStatusMap(metadataList: McpIntegrationMetadata[]): Record<McpClientId, McpIntegrationStatus> {
  return metadataList.reduce((acc, metadata) => {
    acc[metadata.id] = createDefaultStatus(metadata);
    return acc;
  }, {} as Record<McpClientId, McpIntegrationStatus>);
}

const bruinStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>(createDefaultStatusMap(bruinMetadata));
const cloudStatusByClient = ref<Record<McpClientId, McpIntegrationStatus>>(createDefaultStatusMap(cloudMetadata));

const hasRequestedInitialStatuses = ref(false);
const togglingIntegration = ref<{ variant: McpVariant; target: McpClientId } | null>(null);
const awaitingPostToggleRefresh = ref<McpVariant | null>(null);
const mcpFeedbackMessage = ref("");
const mcpFeedbackType = ref<"success" | "error" | "">("");
const dismissedStatusAlerts = ref<Record<string, boolean>>({});

const cloudBearerToken = ref("");
const cloudTokenEditable = ref(false);
const isCloudToggleEnabled = computed(
  () => cloudBearerToken.value.trim().length > 0 && !cloudTokenEditable.value
);

const bruinIntegrations = computed(() =>
  bruinMetadata.map((integration) => ({
    ...integration,
    status: bruinStatusByClient.value[integration.id] ?? createDefaultStatus(integration),
  }))
);

const cloudIntegrations = computed(() =>
  cloudMetadata.map((integration) => ({
    ...integration,
    status: cloudStatusByClient.value[integration.id] ?? createDefaultStatus(integration),
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

const mcpStatusAlerts = computed(() => {
  const bySection = [
    {
      sectionLabel: "Bruin MCP",
      integrations: bruinIntegrations.value,
    },
    {
      sectionLabel: "Bruin Cloud MCP",
      integrations: cloudIntegrations.value,
    },
  ];

  return bySection
    .flatMap(({ sectionLabel, integrations }) =>
      integrations.map((integration) => {
        const problemLabel = mcpProblemStatusLabel(integration.status.status);
        if (!problemLabel) {
          return null;
        }

        const key = `${sectionLabel}:${integration.id}:${integration.status.status}:${integration.status.details}`;
        if (dismissedStatusAlerts.value[key]) {
          return null;
        }

        return {
          key,
          className: mcpProblemStatusClass(integration.status.status),
          message: `${sectionLabel} / ${integration.label} - ${problemLabel}: ${integration.status.details}`,
        };
      })
    )
    .filter((item): item is { key: string; className: string; message: string } => Boolean(item));
});

function getStatusMap(variant: McpVariant): Record<McpClientId, McpIntegrationStatus> {
  return variant === "cloud" ? cloudStatusByClient.value : bruinStatusByClient.value;
}

function setStatusMap(variant: McpVariant, value: Record<McpClientId, McpIntegrationStatus>) {
  if (variant === "cloud") {
    cloudStatusByClient.value = value;
    return;
  }

  bruinStatusByClient.value = value;
}

function resetStatusesToChecking(variant: McpVariant) {
  const metadata = variant === "cloud" ? cloudMetadata : bruinMetadata;
  setStatusMap(variant, createDefaultStatusMap(metadata));
}

function requestMcpStatuses(variant: McpVariant) {
  resetStatusesToChecking(variant);
  vscode.postMessage({ command: "bruin.getMcpIntegrationStatus", payload: { variant } });
}

function refreshAllMcpStatuses() {
  requestMcpStatuses("bruin");
  requestMcpStatuses("cloud");
}

function requestInitialStatusesIfAllowed() {
  if (!props.allowInitialLoad || hasRequestedInitialStatuses.value) {
    return;
  }

  hasRequestedInitialStatuses.value = true;
  refreshAllMcpStatuses();
}

function isToggling(variant: McpVariant, target: McpClientId): boolean {
  return togglingIntegration.value?.variant === variant && togglingIntegration.value?.target === target;
}

function isIntegrationLoading(variant: McpVariant, target: McpClientId, status: McpIntegrationStatus): boolean {
  if (variant === "cloud" && !isCloudToggleEnabled.value) {
    return status.status === "checking";
  }
  return isToggling(variant, target) || status.status === "checking";
}

function toggleMcpIntegration(variant: McpVariant, target: McpClientId, currentlyConfigured: boolean) {
  if (togglingIntegration.value) {
    return;
  }

  if (variant === "cloud" && !isCloudToggleEnabled.value) {
    mcpFeedbackType.value = "error";
    mcpFeedbackMessage.value = "Set a bearer token and press check to confirm before configuring Bruin Cloud MCP.";
    return;
  }

  const isCloudInstall = variant === "cloud" && !currentlyConfigured;
  if (isCloudInstall && !cloudBearerToken.value.trim()) {
    cloudTokenEditable.value = true;
    mcpFeedbackType.value = "error";
    mcpFeedbackMessage.value = "Bearer token is required for Bruin Cloud MCP.";
    return;
  }

  togglingIntegration.value = { variant, target };
  awaitingPostToggleRefresh.value = null;
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";

  vscode.postMessage({
    command: currentlyConfigured ? "bruin.uninstallMcpIntegration" : "bruin.installMcpIntegration",
    payload: {
      variant,
      target,
      bearerToken: variant === "cloud" ? cloudBearerToken.value.trim() : undefined,
    },
  });
}

function toggleCloudTokenEdit() {
  if (cloudTokenEditable.value) {
    cloudBearerToken.value = cloudBearerToken.value.trim();
  }
  cloudTokenEditable.value = !cloudTokenEditable.value;
}

function handleMessage(event: MessageEvent) {
  const message = event.data;
  switch (message.command) {
    case "mcp-integration-status-message": {
      const variant: McpVariant = message.payload?.variant === "cloud" ? "cloud" : "bruin";
      if (message.payload?.status === "success" && Array.isArray(message.payload?.message)) {
        const updatedStatuses = { ...getStatusMap(variant) };
        message.payload.message.forEach((statusItem: McpIntegrationStatus) => {
          if (statusItem?.id) {
            updatedStatuses[statusItem.id] = statusItem;
          }
        });
        setStatusMap(variant, updatedStatuses);

        if (awaitingPostToggleRefresh.value === variant && togglingIntegration.value?.variant === variant) {
          const targetId = togglingIntegration.value.target;
          if (updatedStatuses[targetId]) {
            togglingIntegration.value = null;
            awaitingPostToggleRefresh.value = null;
          }
        }
      } else {
        if (togglingIntegration.value?.variant === variant) {
          togglingIntegration.value = null;
          awaitingPostToggleRefresh.value = null;
        }
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to load MCP statuses.";
      }
      break;
    }

    case "mcp-integration-install-message": {
      const variant: McpVariant = message.payload?.variant === "cloud" ? "cloud" : "bruin";
      if (message.payload?.status === "success") {
        awaitingPostToggleRefresh.value = variant;
        const feedbackMessage = String(message.payload?.message || "MCP integration updated.");
        mcpFeedbackType.value = /disabled\s+bruin/i.test(feedbackMessage) ? "" : "success";
        mcpFeedbackMessage.value = feedbackMessage;
      } else {
        if (togglingIntegration.value?.variant === variant) {
          togglingIntegration.value = null;
          awaitingPostToggleRefresh.value = null;
        }
        mcpFeedbackType.value = "error";
        mcpFeedbackMessage.value = message.payload?.message || "Failed to update MCP integration.";
      }
      break;
    }
  }
}

function openBruinMcpDocs() {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: bruinMcpDocsUrl,
  });
}

function openBruinCloudMcpDocs() {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: bruinCloudMcpDocsUrl,
  });
}

function dismissMcpFeedback() {
  mcpFeedbackMessage.value = "";
  mcpFeedbackType.value = "";
}

function dismissStatusAlert(key: string) {
  dismissedStatusAlerts.value[key] = true;
}

function mcpIntegrationCardClass(
  variant: McpVariant,
  id: McpClientId,
  status: McpIntegrationStatus
): string {
  if (variant === "cloud" && !isCloudToggleEnabled.value) {
    switch (status.status) {
      case "checking":
        return "bg-blue-500/10 border-blue-500/40 opacity-55";
      case "ready":
        return "bg-green-500/10 border-green-500/40 opacity-55";
      case "client_missing":
        return "bg-yellow-500/10 border-yellow-500/40 opacity-55";
      case "bruin_missing":
        return "bg-orange-500/10 border-orange-500/40 opacity-55";
      case "error":
        return "bg-red-500/10 border-red-500/40 opacity-55";
      case "not_configured":
      default:
        return "bg-input-background border-commandCenter-border opacity-60";
    }
  }

  if (isToggling(variant, id)) {
    return "bg-blue-500/10 border-blue-500/40";
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

function mcpPowerButtonClass(
  variant: McpVariant,
  id: McpClientId,
  status: McpIntegrationStatus
): string {
  if (variant === "cloud" && !isCloudToggleEnabled.value) {
    switch (status.status) {
      case "checking":
        return "border-blue-500/60 bg-blue-500/20 text-blue-300 opacity-55";
      case "ready":
        return "border-green-500/60 bg-green-500/20 text-green-300 opacity-55";
      case "client_missing":
        return "border-yellow-500/60 bg-yellow-500/20 text-yellow-300 opacity-55";
      case "bruin_missing":
        return "border-orange-500/60 bg-orange-500/20 text-orange-300 opacity-55";
      case "error":
        return "border-red-500/60 bg-red-500/20 text-red-300 opacity-55";
      case "not_configured":
      default:
        return "border-commandCenter-border bg-input-background text-editor-fg opacity-60";
    }
  }

  if (isToggling(variant, id)) {
    return "border-blue-500/60 bg-blue-500/20 text-blue-300";
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
