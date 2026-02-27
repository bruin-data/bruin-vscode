import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export type McpClientId = "vscode" | "cursor" | "codex" | "claude";
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

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function removeCodexMcpServerIfExists(workspaceRoot: string | undefined): Promise<void> {
  try {
    await execAsync("codex mcp remove bruin", {
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

async function removeClaudeMcpServerIfExists(): Promise<void> {
  try {
    await execAsync("claude mcp remove -s user bruin", {
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
  const checkCommand =
    process.platform === "win32" ? `where ${commandName}` : `command -v ${commandName}`;
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
  // For MCP workspace config, always anchor to the opened workspace root instead of
  // the last active file context (which can be stale across panel restores).
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

async function readJsonFile(filePath: string): Promise<any> {
  const content = await fs.promises.readFile(filePath, "utf8");
  return JSON.parse(content);
}

function hasBruinMcpServerDefinition(config: any): boolean {
  const server = config?.servers?.bruin || config?.mcpServers?.bruin;
  if (!server || typeof server !== "object" || Array.isArray(server)) {
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
      requiresClientCli: false,
    });
  }

  try {
    const config = await readJsonFile(params.configPath);
    const configured = hasBruinMcpServerDefinition(config);
    return evaluateStatus({
      id: params.id,
      label: params.label,
      configured,
      clientAvailable: true,
      bruinAvailable: params.bruinAvailable,
      configPath: params.configPath,
      details: configured
        ? `Configured in ${params.configPath}.`
        : `Config exists but Bruin MCP entry is missing in ${params.configPath}.`,
      requiresClientCli: false,
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
      requiresClientCli: false,
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
  const blockMatch = content.match(/\[mcp_servers\.bruin\]([\s\S]*?)(?=\n\[|$)/);
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

function outputContainsBruinListEntry(output: string): boolean {
  return /^\s*bruin(?:\s*:|\s{2,}|\t)/im.test(output) || /^\s*bruin\s*$/im.test(output);
}

async function getCodexMcpStatus(
  workspaceRoot: string | undefined,
  bruinAvailable: boolean,
  codexCliAvailable: boolean
): Promise<McpIntegrationStatus> {
  if (codexCliAvailable) {
    try {
      const { stdout, stderr } = await execAsync("codex mcp list", {
        cwd: workspaceRoot,
        timeout: 20000,
      });
      const output = `${stdout || ""}\n${stderr || ""}`;
      if (outputContainsBruinListEntry(output)) {
        return evaluateStatus({
          id: "codex",
          label: "Codex CLI",
          configured: true,
          clientAvailable: true,
          bruinAvailable,
          details: "Bruin MCP is configured in Codex CLI.",
          requiresClientCli: true,
        });
      }
    } catch {
      // Fall back to config-file detection below.
    }
  }

  const candidatePaths: string[] = [];
  if (workspaceRoot) {
    candidatePaths.push(path.join(workspaceRoot, ".codex", "config.toml"));
  }
  candidatePaths.push(path.join(os.homedir(), ".codex", "config.toml"));

  for (const configPath of candidatePaths) {
    if (!fs.existsSync(configPath)) {
      continue;
    }
    try {
      const content = await fs.promises.readFile(configPath, "utf8");
      const configured = hasBruinCodexMcpServer(content);
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
    details: "No Bruin MCP server found in Codex config.",
    requiresClientCli: true,
  });
}

async function getClaudeMcpStatus(
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

  try {
    const { stdout, stderr } = await execAsync("claude mcp get bruin", {
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
        details: `Bruin MCP is configured in ${scope}, not in global user scope.`,
        requiresClientCli: true,
      });
    }

    return evaluateStatus({
      id: "claude",
      label: "Claude Code",
      configured: true,
      clientAvailable: true,
      bruinAvailable,
      details: "Bruin MCP is configured in Claude Code (global user scope).",
      requiresClientCli: true,
    });
  } catch {
    return evaluateStatus({
      id: "claude",
      label: "Claude Code",
      configured: false,
      clientAvailable: true,
      bruinAvailable,
      details: "Bruin MCP is not configured in Claude Code (global user scope).",
      requiresClientCli: true,
    });
  }
}

async function writeBruinMcpJsonConfig(
  configPath: string,
  serverRootKey: "servers" | "mcpServers"
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
    config[serverRootKey] &&
    typeof config[serverRootKey] === "object" &&
    !Array.isArray(config[serverRootKey])
      ? config[serverRootKey]
      : {};

  config[serverRootKey] = {
    ...existingServers,
    bruin: {
      command: "bruin",
      args: ["mcp"],
    },
  };

  await fs.promises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function removeBruinMcpJsonConfig(configPath: string): Promise<void> {
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
    if (root && typeof root === "object" && !Array.isArray(root) && root.bruin) {
      delete root.bruin;
      updated = true;
    }
  }

  if (updated) {
    await fs.promises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }
}

export async function getMcpIntegrationStatuses(
  lastRenderedDocumentUri: vscode.Uri | undefined
): Promise<McpIntegrationStatus[]> {
  const workspaceRoot = getWorkspaceRoot(lastRenderedDocumentUri);
  const bruinAvailable = await isBruinCliAvailable();
  const [codexCliAvailable, claudeCliAvailable] = await Promise.all([
    commandExists("codex"),
    commandExists("claude"),
  ]);

  const vscodeConfigPath = getVsCodeGlobalMcpConfigPath();
  const cursorConfigPath = getCursorGlobalMcpConfigPath();

  const vscodeStatus = await getJsonMcpConfigStatus({
    id: "vscode",
    label: "VS Code",
    configPath: vscodeConfigPath,
    bruinAvailable,
  });

  const cursorStatus = await getJsonMcpConfigStatus({
    id: "cursor",
    label: "Cursor",
    configPath: cursorConfigPath,
    bruinAvailable,
  });

  const codexStatus = await getCodexMcpStatus(workspaceRoot, bruinAvailable, codexCliAvailable);
  const claudeStatus = await getClaudeMcpStatus(bruinAvailable, claudeCliAvailable);

  return [vscodeStatus, cursorStatus, codexStatus, claudeStatus];
}

export async function installMcpIntegration(
  target: McpClientId,
  lastRenderedDocumentUri: vscode.Uri | undefined
): Promise<McpIntegrationInstallResult> {
  const workspaceRoot = getWorkspaceRoot(lastRenderedDocumentUri);

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
      await removeCodexMcpServerIfExists(workspaceRoot);
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
      await removeClaudeMcpServerIfExists();
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

export async function uninstallMcpIntegration(
  target: McpClientId,
  lastRenderedDocumentUri: vscode.Uri | undefined
): Promise<McpIntegrationUninstallResult> {
  const workspaceRoot = getWorkspaceRoot(lastRenderedDocumentUri);

  switch (target) {
    case "vscode": {
      const configPath = getVsCodeGlobalMcpConfigPath();
      await removeBruinMcpJsonConfig(configPath);
      return {
        target,
        message: `Disabled Bruin MCP in ${configPath}.`,
      };
    }
    case "cursor": {
      const configPath = getCursorGlobalMcpConfigPath();
      await removeBruinMcpJsonConfig(configPath);
      return {
        target,
        message: `Disabled Bruin MCP in ${configPath}.`,
      };
    }
    case "codex": {
      const codexAvailable = await commandExists("codex");
      if (!codexAvailable) {
        throw new Error("Codex CLI is not available in PATH.");
      }
      await removeCodexMcpServerIfExists(workspaceRoot);
      return {
        target,
        message: "Disabled Bruin MCP for Codex CLI.",
      };
    }
    case "claude": {
      const claudeAvailable = await commandExists("claude");
      if (!claudeAvailable) {
        throw new Error("Claude CLI is not available in PATH.");
      }
      await removeClaudeMcpServerIfExists();
      return {
        target,
        message: "Disabled Bruin MCP for Claude Code (global user scope).",
      };
    }
    default:
      throw new Error(`Unsupported MCP integration target: ${target}`);
  }
}
