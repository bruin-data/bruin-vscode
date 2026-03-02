import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const BRUIN_CLOUD_MCP_URL = "https://cloud.getbruin.com/mcp";
const BRUIN_LOCAL_SERVER_NAME = "bruin";
const BRUIN_CLOUD_SERVER_NAME = "bruin_cloud";

export type McpClientId = "vscode" | "cursor" | "codex" | "claude";
export type McpVariant = "bruin" | "cloud";
export type McpIntegrationStatusType =
  | "ready"
  | "not_configured"
  | "client_missing"
  | "bruin_missing"
  | "error";

export interface McpIntegrationStatus {
  id: McpClientId;
  label: string;
  status: McpIntegrationStatusType;
  configured: boolean;
  clientAvailable: boolean;
  bruinAvailable: boolean;
  configPath: string | null;
  details: string;
}

export interface McpIntegrationInstallResult {
  target: McpClientId;
  message: string;
}

export interface McpIntegrationUninstallResult {
  target: McpClientId;
  message: string;
}

function formatExecError(error: unknown): string {
  if (!error) {
    return "";
  }

  if (typeof error === "object" && error !== null) {
    const execError = error as { message?: string; stderr?: string; stdout?: string };
    const parts = [execError.message || "", execError.stderr || "", execError.stdout || ""]
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join("\n");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function removeCodexMcpServerIfExists(
  serverName: string,
  workspaceRoot: string | undefined
): Promise<void> {
  try {
    await execAsync(`codex mcp remove ${serverName}`, {
      cwd: workspaceRoot,
      timeout: 30000,
    });
  } catch {
    // we intentionally ignore errors from `codex mcp remove`
  }
}

function isClaudeMcpMissingServerError(message: string): boolean {
  return /no .*mcp server .*found/i.test(message);
}

async function removeClaudeMcpServerIfExists(serverName: string): Promise<void> {
  try {
    await execFileAsync("claude", ["mcp", "remove", "-s", "user", serverName], {
      cwd: os.homedir(),
      timeout: 30000,
    });
  } catch (error) {
    const errorMessage = formatExecError(error);
    if (!isClaudeMcpMissingServerError(errorMessage)) {
      throw error;
    }
  }
}

async function commandExists(commandName: string): Promise<boolean> {
  const checkCommand = process.platform === "win32" ? `where ${commandName}` : `command -v ${commandName}`;
  try {
    await execAsync(checkCommand);
    return true;
  } catch {
    return false;
  }
}

async function isBruinCliAvailable(): Promise<boolean> {
  const bruinExecutablePath = getBruinExecutablePath();
  try {
    await execFileAsync(bruinExecutablePath, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

function getWorkspaceRoot(lastRenderedDocumentUri: vscode.Uri | undefined): string | undefined {
  const primaryWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (primaryWorkspace) {
    return primaryWorkspace;
  }

  if (lastRenderedDocumentUri) {
    const workspaceForDocument = vscode.workspace.getWorkspaceFolder(lastRenderedDocumentUri);
    if (workspaceForDocument) {
      return workspaceForDocument.uri.fsPath;
    }
  }

  return undefined;
}

function getVsCodeGlobalMcpConfigPath(): string {
  const productFolder = "Code";

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", productFolder, "User", "mcp.json");
  }

  if (process.platform === "win32") {
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appDataPath, productFolder, "User", "mcp.json");
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(xdgConfig, productFolder, "User", "mcp.json");
}

function getCursorGlobalMcpConfigPath(): string {
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

function getCodexGlobalConfigPath(): string {
  return path.join(os.homedir(), ".codex", "config.toml");
}

async function readJsonFile(filePath: string): Promise<any> {
  const content = await fs.promises.readFile(filePath, "utf8");
  return JSON.parse(content);
}

function getJsonServer(config: any, serverName: string): any | null {
  const fromServers = config?.servers?.[serverName];
  if (fromServers && typeof fromServers === "object" && !Array.isArray(fromServers)) {
    return fromServers;
  }

  const fromMcpServers = config?.mcpServers?.[serverName];
  if (fromMcpServers && typeof fromMcpServers === "object" && !Array.isArray(fromMcpServers)) {
    return fromMcpServers;
  }

  return null;
}

function hasBruinMcpServerDefinition(config: any): boolean {
  const server = getJsonServer(config, BRUIN_LOCAL_SERVER_NAME);
  if (!server) {
    return false;
  }

  const command = typeof server.command === "string" ? server.command.toLowerCase() : "";
  const args = Array.isArray(server.args)
    ? server.args.map((value: unknown) => String(value).toLowerCase())
    : [];

  const commandLooksLikeBruin =
    command === "bruin" ||
    command.endsWith("/bruin") ||
    command.endsWith("\\bruin") ||
    command.endsWith("/bruin.exe") ||
    command.endsWith("\\bruin.exe") ||
    command.includes("bruin");

  return commandLooksLikeBruin && args.includes("mcp");
}

function hasBruinCloudMcpServerDefinition(config: any): boolean {
  const server = getJsonServer(config, BRUIN_CLOUD_SERVER_NAME);
  if (!server) {
    return false;
  }

  const type = typeof server.type === "string" ? server.type.toLowerCase() : "";
  const url = typeof server.url === "string" ? server.url.toLowerCase() : "";
  const authHeader =
    typeof server.headers?.Authorization === "string"
      ? server.headers.Authorization
      : typeof server.headers?.authorization === "string"
        ? server.headers.authorization
        : "";

  return type === "streamable-http" && url === BRUIN_CLOUD_MCP_URL && /bearer\s+.+/i.test(authHeader);
}

function evaluateStatus(params: {
  id: McpClientId;
  label: string;
  configured: boolean;
  clientAvailable: boolean;
  bruinAvailable: boolean;
  configPath?: string | null;
  details: string;
  requiresClientCli: boolean;
  error?: string;
}): McpIntegrationStatus {
  if (params.error) {
    return {
      id: params.id,
      label: params.label,
      configured: params.configured,
      clientAvailable: params.clientAvailable,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath ?? null,
      details: params.error,
      status: "error",
    };
  }

  if (params.configured) {
    if (!params.bruinAvailable) {
      return {
        id: params.id,
        label: params.label,
        configured: true,
        clientAvailable: params.clientAvailable,
        bruinAvailable: false,
        configPath: params.configPath ?? null,
        details: "Configured, but Bruin CLI is not available.",
        status: "bruin_missing",
      };
    }
    if (params.requiresClientCli && !params.clientAvailable) {
      return {
        id: params.id,
        label: params.label,
        configured: true,
        clientAvailable: false,
        bruinAvailable: params.bruinAvailable,
        configPath: params.configPath ?? null,
        details: "Configured, but client CLI is not available in PATH.",
        status: "client_missing",
      };
    }
    return {
      id: params.id,
      label: params.label,
      configured: true,
      clientAvailable: params.clientAvailable,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath ?? null,
      details: params.details,
      status: "ready",
    };
  }

  if (params.requiresClientCli && !params.clientAvailable) {
    return {
      id: params.id,
      label: params.label,
      configured: false,
      clientAvailable: false,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath ?? null,
      details: "Client CLI is not available in PATH.",
      status: "client_missing",
    };
  }

  return {
    id: params.id,
    label: params.label,
    configured: false,
    clientAvailable: params.clientAvailable,
    bruinAvailable: params.bruinAvailable,
    configPath: params.configPath ?? null,
    details: params.details,
    status: "not_configured",
  };
}

async function getJsonMcpConfigStatus(params: {
  id: McpClientId;
  label: string;
  configPath: string;
  bruinAvailable: boolean;
  requiresClientCli?: boolean;
  isConfigured: (config: any) => boolean;
  configuredDetails: string;
  missingDetails: string;
}): Promise<McpIntegrationStatus> {
  const fileExists = fs.existsSync(params.configPath);
  if (!fileExists) {
    return evaluateStatus({
      id: params.id,
      label: params.label,
      configured: false,
      clientAvailable: true,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath,
      details: `No MCP config found at ${params.configPath}.`,
      requiresClientCli: Boolean(params.requiresClientCli),
    });
  }

  try {
    const config = await readJsonFile(params.configPath);
    const configured = params.isConfigured(config);
    return evaluateStatus({
      id: params.id,
      label: params.label,
      configured,
      clientAvailable: true,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath,
      details: configured ? params.configuredDetails : params.missingDetails,
      requiresClientCli: Boolean(params.requiresClientCli),
    });
  } catch (error) {
    return evaluateStatus({
      id: params.id,
      label: params.label,
      configured: false,
      clientAvailable: true,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath,
      details: "",
      requiresClientCli: Boolean(params.requiresClientCli),
      error: `Invalid JSON in ${params.configPath}: ${error}`,
    });
  }
}

function parseTomlArrayValues(rawValues: string): string[] {
  return rawValues
    .split(",")
    .map((value) => value.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function hasBruinCodexMcpServer(content: string): boolean {
  const blockMatch = content.match(/\[mcp_servers\.(?:bruin|"bruin"|'bruin')\]([\s\S]*?)(?=\n\[|$)/i);
  if (!blockMatch) {
    return false;
  }

  const blockContent = blockMatch[1];
  const commandMatch = blockContent.match(/command\s*=\s*["']([^"']+)["']/i);
  const argsMatch = blockContent.match(/args\s*=\s*\[([^\]]*)\]/i);
  const command = commandMatch?.[1]?.toLowerCase() ?? "";
  const args = argsMatch ? parseTomlArrayValues(argsMatch[1]).map((arg) => arg.toLowerCase()) : [];

  const commandIsBruin = command.length > 0 && command.includes("bruin");
  const hasMcpArg = args.includes("mcp");
  return commandIsBruin && (args.length === 0 || hasMcpArg || blockContent.toLowerCase().includes("mcp"));
}

function hasBruinCloudCodexMcpServer(content: string): boolean {
  const blockMatch = content.match(
    /\[mcp_servers\.(?:bruin_cloud|"bruin_cloud"|'bruin_cloud')\]([\s\S]*?)(?=\n\[|$)/i
  );
  if (!blockMatch) {
    return false;
  }

  const blockContent = blockMatch[1];
  const hasExpectedUrl = /url\s*=\s*["']https:\/\/cloud\.getbruin\.com\/mcp["']/i.test(blockContent);
  const hasInlineBearerHeader =
    /http_headers\s*=\s*\{[^}]*authorization\s*=\s*["']bearer\s+.+["'][^}]*\}/i.test(blockContent);
  const nestedHeaderMatch = content.match(
    /\[mcp_servers\.(?:bruin_cloud|"bruin_cloud"|'bruin_cloud')\.(?:http_headers|"http_headers"|'http_headers')\]([\s\S]*?)(?=\n\[|$)/i
  );
  const hasNestedBearerHeader = Boolean(
    nestedHeaderMatch && /authorization\s*=\s*["']bearer\s+.+["']/i.test(nestedHeaderMatch[1])
  );
  return hasExpectedUrl && (hasInlineBearerHeader || hasNestedBearerHeader);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function outputContainsListEntry(output: string, serverName: string): boolean {
  const escaped = escapeRegExp(serverName);
  const entryRegex = new RegExp(`^\\s*${escaped}(?:\\s*:|\\s{2,}|\\t)`, "im");
  const exactRegex = new RegExp(`^\\s*${escaped}\\s*$`, "im");
  return entryRegex.test(output) || exactRegex.test(output);
}

async function getCodexMcpStatus(
  variant: McpVariant,
  workspaceRoot: string | undefined,
  bruinAvailable: boolean,
  codexCliAvailable: boolean
): Promise<McpIntegrationStatus> {
  const isCloud = variant === "cloud";
  const serverName = isCloud ? BRUIN_CLOUD_SERVER_NAME : BRUIN_LOCAL_SERVER_NAME;

  if (codexCliAvailable) {
    try {
      const { stdout, stderr } = await execAsync("codex mcp list", {
        cwd: workspaceRoot,
        timeout: 20000,
      });
      const output = `${stdout || ""}\n${stderr || ""}`;
      if (outputContainsListEntry(output, serverName)) {
        return evaluateStatus({
          id: "codex",
          label: "Codex CLI",
          configured: true,
          clientAvailable: true,
          bruinAvailable,
          details: isCloud ? "Bruin Cloud MCP is configured in Codex CLI." : "Bruin MCP is configured in Codex CLI.",
          requiresClientCli: true,
        });
      }
    } catch {
      // Fall back to config-file detection below.
    }
  }

  const candidatePaths: string[] = [];
  if (!isCloud && workspaceRoot) {
    candidatePaths.push(path.join(workspaceRoot, ".codex", "config.toml"));
  }
  candidatePaths.push(getCodexGlobalConfigPath());

  for (const configPath of candidatePaths) {
    if (!fs.existsSync(configPath)) {
      continue;
    }
    try {
      const content = await fs.promises.readFile(configPath, "utf8");
      const configured = isCloud ? hasBruinCloudCodexMcpServer(content) : hasBruinCodexMcpServer(content);
      if (configured) {
        return evaluateStatus({
          id: "codex",
          label: "Codex CLI",
          configured: true,
          clientAvailable: codexCliAvailable,
          bruinAvailable,
          configPath,
          details: `Configured in ${configPath}.`,
          requiresClientCli: true,
        });
      }
    } catch (error) {
      return evaluateStatus({
        id: "codex",
        label: "Codex CLI",
        configured: false,
        clientAvailable: codexCliAvailable,
        bruinAvailable,
        configPath,
        details: "",
        requiresClientCli: true,
        error: `Unable to read ${configPath}: ${error}`,
      });
    }
  }

  return evaluateStatus({
    id: "codex",
    label: "Codex CLI",
    configured: false,
    clientAvailable: codexCliAvailable,
    bruinAvailable,
    details: isCloud ? "No Bruin Cloud MCP server found in Codex config." : "No Bruin MCP server found in Codex config.",
    requiresClientCli: true,
  });
}

async function getClaudeMcpStatus(
  variant: McpVariant,
  bruinAvailable: boolean,
  claudeCliAvailable: boolean
): Promise<McpIntegrationStatus> {
  if (!claudeCliAvailable) {
    return evaluateStatus({
      id: "claude",
      label: "Claude Code",
      configured: false,
      clientAvailable: false,
      bruinAvailable,
      details: "Claude CLI is not installed or not available in PATH.",
      requiresClientCli: true,
    });
  }

  const isCloud = variant === "cloud";
  const serverName = isCloud ? BRUIN_CLOUD_SERVER_NAME : BRUIN_LOCAL_SERVER_NAME;

  try {
    const { stdout, stderr } = await execAsync(`claude mcp get ${serverName}`, {
      cwd: os.homedir(),
      timeout: 20000,
    });
    const output = `${stdout || ""}\n${stderr || ""}`;
    const scopeMatch = output.match(/Scope:\s*([^\n\r]+)/i);
    const scope = scopeMatch?.[1]?.trim() ?? "";
    const isUserScope = /\buser\b/i.test(scope);

    if (!isUserScope && scope.length > 0) {
      return evaluateStatus({
        id: "claude",
        label: "Claude Code",
        configured: false,
        clientAvailable: true,
        bruinAvailable,
        details: isCloud
          ? `Bruin Cloud MCP is configured in ${scope}, not in global user scope.`
          : `Bruin MCP is configured in ${scope}, not in global user scope.`,
        requiresClientCli: true,
      });
    }

    if (isCloud && !output.toLowerCase().includes(BRUIN_CLOUD_MCP_URL)) {
      return evaluateStatus({
        id: "claude",
        label: "Claude Code",
        configured: false,
        clientAvailable: true,
        bruinAvailable,
        details: "Bruin Cloud MCP exists in Claude Code, but URL is not set to https://cloud.getbruin.com/mcp.",
        requiresClientCli: true,
      });
    }

    return evaluateStatus({
      id: "claude",
      label: "Claude Code",
      configured: true,
      clientAvailable: true,
      bruinAvailable,
      details: isCloud
        ? "Bruin Cloud MCP is configured in Claude Code (global user scope)."
        : "Bruin MCP is configured in Claude Code (global user scope).",
      requiresClientCli: true,
    });
  } catch {
    return evaluateStatus({
      id: "claude",
      label: "Claude Code",
      configured: false,
      clientAvailable: true,
      bruinAvailable,
      details: isCloud
        ? "Bruin Cloud MCP is not configured in Claude Code (global user scope)."
        : "Bruin MCP is not configured in Claude Code (global user scope).",
      requiresClientCli: true,
    });
  }
}

async function upsertJsonMcpServerConfig(
  configPath: string,
  serverRootKey: "servers" | "mcpServers",
  serverName: string,
  serverConfig: Record<string, unknown>
): Promise<void> {
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });

  let config: Record<string, any> = {};
  if (fs.existsSync(configPath)) {
    config = await readJsonFile(configPath);
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error(`Invalid MCP JSON structure in ${configPath}`);
    }
  }

  const existingServers =
    config[serverRootKey] && typeof config[serverRootKey] === "object" && !Array.isArray(config[serverRootKey])
      ? config[serverRootKey]
      : {};

  config[serverRootKey] = {
    ...existingServers,
    [serverName]: serverConfig,
  };

  await fs.promises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function writeBruinMcpJsonConfig(
  configPath: string,
  serverRootKey: "servers" | "mcpServers"
): Promise<void> {
  await upsertJsonMcpServerConfig(configPath, serverRootKey, BRUIN_LOCAL_SERVER_NAME, {
    command: "bruin",
    args: ["mcp"],
  });
}

async function writeBruinCloudCursorMcpJsonConfig(configPath: string, bearerToken: string): Promise<void> {
  await upsertJsonMcpServerConfig(configPath, "mcpServers", BRUIN_CLOUD_SERVER_NAME, {
    type: "streamable-http",
    url: BRUIN_CLOUD_MCP_URL,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });
}

async function removeMcpJsonServerConfig(configPath: string, serverName: string): Promise<void> {
  if (!fs.existsSync(configPath)) {
    return;
  }

  const config = await readJsonFile(configPath);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`Invalid MCP JSON structure in ${configPath}`);
  }

  let updated = false;
  for (const rootKey of ["servers", "mcpServers"] as const) {
    const root = config[rootKey];
    if (root && typeof root === "object" && !Array.isArray(root) && root[serverName]) {
      delete root[serverName];
      updated = true;
    }
  }

  if (updated) {
    await fs.promises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }
}

function parseTomlSectionHeader(line: string): string | null {
  const match = line.match(/^\s*\[([^\]]+)\]\s*$/);
  if (!match?.[1]) {
    return null;
  }

  return match[1].trim().toLowerCase();
}

function normalizeTomlSectionPath(path: string): string {
  return path
    .split(".")
    .map((part) => part.trim().replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
    .join(".")
    .toLowerCase();
}

function removeTomlSections(content: string, sectionHeaders: string[]): { updatedContent: string; changed: boolean } {
  const targetHeaders = sectionHeaders.map((header) => normalizeTomlSectionPath(header));
  const lines = content.split(/\r?\n/);
  const remainingLines: string[] = [];
  let changed = false;

  for (let index = 0; index < lines.length; index += 1) {
    const currentHeaderRaw = parseTomlSectionHeader(lines[index]);
    const currentHeader = currentHeaderRaw ? normalizeTomlSectionPath(currentHeaderRaw) : null;
    const shouldRemove =
      currentHeader &&
      targetHeaders.some((targetHeader) => currentHeader === targetHeader || currentHeader.startsWith(`${targetHeader}.`));

    if (shouldRemove) {
      changed = true;
      index += 1;

      while (index < lines.length) {
        if (parseTomlSectionHeader(lines[index])) {
          index -= 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    remainingLines.push(lines[index]);
  }

  if (!changed) {
    return { updatedContent: content, changed: false };
  }

  const updatedContent = remainingLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return { updatedContent: updatedContent.length > 0 ? `${updatedContent}\n` : "", changed: true };
}

function tomlEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildBruinCloudCodexSection(bearerToken: string): string {
  const escapedToken = tomlEscape(bearerToken);
  return [
    "[mcp_servers.bruin_cloud]",
    `url = \"${BRUIN_CLOUD_MCP_URL}\"`,
    `http_headers = { Authorization = \"Bearer ${escapedToken}\" }`,
    "enabled = true",
    "",
  ].join("\n");
}

async function upsertBruinCloudCodexConfig(bearerToken: string): Promise<string> {
  const configPath = getCodexGlobalConfigPath();
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });

  const existingContent = fs.existsSync(configPath) ? await fs.promises.readFile(configPath, "utf8") : "";
  const withoutSection = removeTomlSections(existingContent, [
    "mcp_servers.bruin_cloud",
    "mcp_servers.\"bruin_cloud\"",
    "mcp_servers.'bruin_cloud'",
  ]).updatedContent.trimEnd();
  const separator = withoutSection.length > 0 ? "\n\n" : "";
  const nextContent = `${withoutSection}${separator}${buildBruinCloudCodexSection(bearerToken)}`;

  await fs.promises.writeFile(configPath, nextContent, "utf8");
  return configPath;
}

async function removeBruinCloudCodexConfig(): Promise<string> {
  const configPath = getCodexGlobalConfigPath();
  if (!fs.existsSync(configPath)) {
    return configPath;
  }

  const content = await fs.promises.readFile(configPath, "utf8");
  const { updatedContent, changed } = removeTomlSections(content, [
    "mcp_servers.bruin_cloud",
    "mcp_servers.\"bruin_cloud\"",
    "mcp_servers.'bruin_cloud'",
  ]);
  if (changed) {
    await fs.promises.writeFile(configPath, updatedContent, "utf8");
  }

  return configPath;
}

export async function getMcpIntegrationStatuses(
  lastRenderedDocumentUri: vscode.Uri | undefined,
  variant: McpVariant = "bruin"
): Promise<McpIntegrationStatus[]> {
  const workspaceRoot = getWorkspaceRoot(lastRenderedDocumentUri);
  const isCloud = variant === "cloud";
  const bruinAvailable = isCloud ? true : await isBruinCliAvailable();

  const [codexCliAvailable, claudeCliAvailable] = await Promise.all([
    commandExists("codex"),
    commandExists("claude"),
  ]);

  if (!isCloud) {
    const vscodeConfigPath = getVsCodeGlobalMcpConfigPath();
    const cursorConfigPath = getCursorGlobalMcpConfigPath();

    const vscodeStatus = await getJsonMcpConfigStatus({
      id: "vscode",
      label: "VS Code",
      configPath: vscodeConfigPath,
      bruinAvailable,
      isConfigured: hasBruinMcpServerDefinition,
      configuredDetails: `Configured in ${vscodeConfigPath}.`,
      missingDetails: `Config exists but Bruin MCP entry is missing in ${vscodeConfigPath}.`,
    });

    const cursorStatus = await getJsonMcpConfigStatus({
      id: "cursor",
      label: "Cursor",
      configPath: cursorConfigPath,
      bruinAvailable,
      isConfigured: hasBruinMcpServerDefinition,
      configuredDetails: `Configured in ${cursorConfigPath}.`,
      missingDetails: `Config exists but Bruin MCP entry is missing in ${cursorConfigPath}.`,
    });

    const codexStatus = await getCodexMcpStatus("bruin", workspaceRoot, bruinAvailable, codexCliAvailable);
    const claudeStatus = await getClaudeMcpStatus("bruin", bruinAvailable, claudeCliAvailable);

    return [vscodeStatus, cursorStatus, codexStatus, claudeStatus];
  }

  const cursorConfigPath = getCursorGlobalMcpConfigPath();
  const cursorStatus = await getJsonMcpConfigStatus({
    id: "cursor",
    label: "Cursor",
    configPath: cursorConfigPath,
    bruinAvailable,
    isConfigured: hasBruinCloudMcpServerDefinition,
    configuredDetails: `Configured in ${cursorConfigPath}.`,
    missingDetails: `Config exists but Bruin Cloud MCP entry is missing in ${cursorConfigPath}.`,
  });

  const codexStatus = await getCodexMcpStatus("cloud", workspaceRoot, bruinAvailable, codexCliAvailable);
  const claudeStatus = await getClaudeMcpStatus("cloud", bruinAvailable, claudeCliAvailable);

  return [cursorStatus, codexStatus, claudeStatus];
}

export async function installMcpIntegration(
  target: McpClientId,
  lastRenderedDocumentUri: vscode.Uri | undefined,
  options?: {
    variant?: McpVariant;
    bearerToken?: string;
  }
): Promise<McpIntegrationInstallResult> {
  const variant = options?.variant ?? "bruin";
  const workspaceRoot = getWorkspaceRoot(lastRenderedDocumentUri);

  if (variant === "bruin") {
    switch (target) {
      case "vscode": {
        const configPath = getVsCodeGlobalMcpConfigPath();
        await writeBruinMcpJsonConfig(configPath, "servers");
        return {
          target,
          message: `Configured Bruin MCP in ${configPath}.`,
        };
      }
      case "cursor": {
        const configPath = getCursorGlobalMcpConfigPath();
        await writeBruinMcpJsonConfig(configPath, "mcpServers");
        return {
          target,
          message: `Configured Bruin MCP in ${configPath}.`,
        };
      }
      case "codex": {
        const codexAvailable = await commandExists("codex");
        if (!codexAvailable) {
          throw new Error("Codex CLI is not available in PATH.");
        }
        await removeCodexMcpServerIfExists(BRUIN_LOCAL_SERVER_NAME, workspaceRoot);
        await execAsync("codex mcp add bruin -- bruin mcp", {
          cwd: workspaceRoot,
          timeout: 30000,
        });
        return {
          target,
          message: "Configured Bruin MCP for Codex CLI.",
        };
      }
      case "claude": {
        const claudeAvailable = await commandExists("claude");
        if (!claudeAvailable) {
          throw new Error("Claude CLI is not available in PATH.");
        }
        await removeClaudeMcpServerIfExists(BRUIN_LOCAL_SERVER_NAME);
        await execAsync("claude mcp add -s user bruin -- bruin mcp", {
          cwd: os.homedir(),
          timeout: 30000,
        });
        return {
          target,
          message: "Configured Bruin MCP for Claude Code (global user scope).",
        };
      }
      default:
        throw new Error(`Unsupported MCP integration target: ${target}`);
    }
  }

  const bearerToken = options?.bearerToken?.trim();
  if (!bearerToken) {
    throw new Error("Bearer token is required for Bruin Cloud MCP.");
  }

  switch (target) {
    case "cursor": {
      const configPath = getCursorGlobalMcpConfigPath();
      await writeBruinCloudCursorMcpJsonConfig(configPath, bearerToken);
      return {
        target,
        message: `Configured Bruin Cloud MCP in ${configPath}.`,
      };
    }
    case "codex": {
      const configPath = await upsertBruinCloudCodexConfig(bearerToken);
      return {
        target,
        message: `Configured Bruin Cloud MCP in ${configPath}.`,
      };
    }
    case "claude": {
      const claudeAvailable = await commandExists("claude");
      if (!claudeAvailable) {
        throw new Error("Claude CLI is not available in PATH.");
      }

      await removeClaudeMcpServerIfExists(BRUIN_CLOUD_SERVER_NAME);
      await execFileAsync(
        "claude",
        [
          "mcp",
          "add",
          "-s",
          "user",
          "--transport",
          "http",
          BRUIN_CLOUD_SERVER_NAME,
          BRUIN_CLOUD_MCP_URL,
          "--header",
          `Authorization: Bearer ${bearerToken}`,
        ],
        {
          cwd: os.homedir(),
          timeout: 30000,
        }
      );

      return {
        target,
        message: "Configured Bruin Cloud MCP for Claude Code (global user scope).",
      };
    }
    default:
      throw new Error(`Unsupported Bruin Cloud MCP integration target: ${target}`);
  }
}

export async function uninstallMcpIntegration(
  target: McpClientId,
  lastRenderedDocumentUri: vscode.Uri | undefined,
  variant: McpVariant = "bruin"
): Promise<McpIntegrationUninstallResult> {
  const workspaceRoot = getWorkspaceRoot(lastRenderedDocumentUri);

  if (variant === "bruin") {
    switch (target) {
      case "vscode": {
        const configPath = getVsCodeGlobalMcpConfigPath();
        await removeMcpJsonServerConfig(configPath, BRUIN_LOCAL_SERVER_NAME);
        return {
          target,
          message: `Removed Bruin MCP from ${configPath}.`,
        };
      }
      case "cursor": {
        const configPath = getCursorGlobalMcpConfigPath();
        await removeMcpJsonServerConfig(configPath, BRUIN_LOCAL_SERVER_NAME);
        return {
          target,
          message: `Removed Bruin MCP from ${configPath}.`,
        };
      }
      case "codex": {
        const codexAvailable = await commandExists("codex");
        if (!codexAvailable) {
          throw new Error("Codex CLI is not available in PATH.");
        }
        await removeCodexMcpServerIfExists(BRUIN_LOCAL_SERVER_NAME, workspaceRoot);
        return {
          target,
          message: "Removed Bruin MCP from Codex CLI.",
        };
      }
      case "claude": {
        const claudeAvailable = await commandExists("claude");
        if (!claudeAvailable) {
          throw new Error("Claude CLI is not available in PATH.");
        }
        await removeClaudeMcpServerIfExists(BRUIN_LOCAL_SERVER_NAME);
        return {
          target,
          message: "Removed Bruin MCP from Claude Code (global user scope).",
        };
      }
      default:
        throw new Error(`Unsupported MCP integration target: ${target}`);
    }
  }

  switch (target) {
    case "cursor": {
      const configPath = getCursorGlobalMcpConfigPath();
      await removeMcpJsonServerConfig(configPath, BRUIN_CLOUD_SERVER_NAME);
      return {
        target,
        message: `Removed Bruin Cloud MCP from ${configPath}.`,
      };
    }
    case "codex": {
      const configPath = await removeBruinCloudCodexConfig();
      return {
        target,
        message: `Removed Bruin Cloud MCP from ${configPath}.`,
      };
    }
    case "claude": {
      const claudeAvailable = await commandExists("claude");
      if (!claudeAvailable) {
        throw new Error("Claude CLI is not available in PATH.");
      }
      await removeClaudeMcpServerIfExists(BRUIN_CLOUD_SERVER_NAME);
      return {
        target,
        message: "Removed Bruin Cloud MCP from Claude Code (global user scope).",
      };
    }
    default:
      throw new Error(`Unsupported Bruin Cloud MCP integration target: ${target}`);
  }
}
