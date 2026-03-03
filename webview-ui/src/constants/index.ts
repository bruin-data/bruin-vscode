import type { McpClientId, McpIntegrationStatus, McpIntegrationStatusType } from "@/types";

export const BRUIN_MCP_DOCS_URL = "https://getbruin.com/docs/bruin/getting-started/bruin-mcp.html";

export const DEFAULT_MCP_STATUS: Record<McpClientId, McpIntegrationStatus> = {
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

export const MCP_INTEGRATION_METADATA: Array<{
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

const DEFAULT_BADGE_CLASS = "bg-input-background text-editor-fg border-commandCenter-border";

export const MCP_STATUS_CONFIG: Record<McpIntegrationStatusType, { label: string; badgeClass: string }> = {
  checking: {
    label: "Checking",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  },
  ready: {
    label: "Ready",
    badgeClass: "bg-green-500/15 text-green-300 border-green-500/40",
  },
  not_configured: {
    label: "Not configured",
    badgeClass: DEFAULT_BADGE_CLASS,
  },
  client_missing: {
    label: "Client missing",
    badgeClass: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  },
  bruin_missing: {
    label: "Bruin missing",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  },
  error: {
    label: "Error",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/40",
  },
};
