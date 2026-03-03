import type { McpClientId, McpIntegrationStatus, McpIntegrationStatusType } from "@/types";

export const BRUIN_MCP_DOCS_URL = "https://getbruin.com/docs/bruin/getting-started/bruin-mcp.html";

export const DEFAULT_MCP_STATUS: Record<McpClientId, McpIntegrationStatus> = {
  vscode: {
    id: "vscode",
    label: "GitHub Copilot (VS Code)",
    status: "checking",
    configured: false,
    clientAvailable: true,
    bruinAvailable: false,
    configPath: null,
    details: "Checking configuration...",
  },
  cursor: {
    id: "cursor",
    label: "Cursor AI",
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
    label: "GitHub Copilot (VS Code)",
    description: "Configures Bruin MCP for GitHub Copilot in VS Code",
  },
  {
    id: "cursor",
    label: "Cursor AI",
    description: "Configures Bruin MCP for Cursor's built-in AI assistant",
  },
  {
    id: "codex",
    label: "Codex CLI",
    description: "Registers Bruin MCP with OpenAI Codex CLI",
  },
  {
    id: "claude",
    label: "Claude Code",
    description: "Registers Bruin MCP with Claude Code CLI",
  },
];

export const MCP_STATUS_CONFIG: Record<McpIntegrationStatusType, { label: string; statusClass: string }> = {
  checking: {
    label: "Checking",
    statusClass: "status-checking",
  },
  ready: {
    label: "Ready",
    statusClass: "status-ready",
  },
  not_configured: {
    label: "Not configured",
    statusClass: "status-default",
  },
  client_missing: {
    label: "Client missing",
    statusClass: "status-warning",
  },
  bruin_missing: {
    label: "Bruin missing",
    statusClass: "status-warning",
  },
  error: {
    label: "Error",
    statusClass: "status-error",
  },
};
