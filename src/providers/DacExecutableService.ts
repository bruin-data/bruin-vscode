import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

/**
 * DacExecutableService - singleton that resolves the `dac` executable path.
 *
 * Mirrors BruinExecutableService: honors a `bruin.dac.executable` setting, then
 * falls back to scanning PATH (and a couple of well-known install dirs). Unlike
 * the bruin service it returns `null` when nothing is found, so callers can
 * surface a clear "DAC not installed" message instead of spawning a path that
 * does not exist.
 */
export class DacExecutableService {
  private static instance: DacExecutableService;
  private cachedExecutablePath: string | null = null;
  private lastConfigCheckTime: number = 0;
  private readonly CONFIG_CACHE_MS = 300_000; // 5 minutes

  private constructor() {
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("bruin.dac.executable")) {
        this.invalidateCache();
      }
    });
  }

  public static getInstance(): DacExecutableService {
    if (!DacExecutableService.instance) {
      DacExecutableService.instance = new DacExecutableService();
    }
    return DacExecutableService.instance;
  }

  private get binaryName(): string {
    return process.platform === "win32" ? "dac.exe" : "dac";
  }

  /**
   * Resolves the dac executable. Returns an absolute path when found, or `null`
   * when dac cannot be located. Result is cached for CONFIG_CACHE_MS.
   */
  public getExecutablePath(): string | null {
    const now = Date.now();
    if (this.cachedExecutablePath !== null && now - this.lastConfigCheckTime < this.CONFIG_CACHE_MS) {
      return this.cachedExecutablePath;
    }
    this.lastConfigCheckTime = now;

    // 1. Explicit setting wins.
    const configured = vscode.workspace.getConfiguration("bruin").get<string>("dac.executable") || "";
    if (configured.length > 0) {
      this.cachedExecutablePath = configured;
      return configured;
    }

    // 2. Scan PATH.
    const paths = (process.env.PATH || "").split(path.delimiter);
    for (const p of paths) {
      if (!p) {
        continue;
      }
      const candidate = path.join(p, this.binaryName);
      if (this.isExecutable(candidate)) {
        this.cachedExecutablePath = candidate;
        return candidate;
      }
    }

    // 3. Common install locations not always on the GUI-app PATH.
    const home = os.homedir();
    const fallbacks = [
      path.join(home, ".local", "bin", this.binaryName),
      path.join(home, "go", "bin", this.binaryName),
      "/usr/local/bin/" + this.binaryName,
      "/opt/homebrew/bin/" + this.binaryName,
    ];
    for (const candidate of fallbacks) {
      if (this.isExecutable(candidate)) {
        this.cachedExecutablePath = candidate;
        return candidate;
      }
    }

    this.cachedExecutablePath = null;
    return null;
  }

  private isExecutable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  public invalidateCache(): void {
    this.cachedExecutablePath = null;
    this.lastConfigCheckTime = 0;
  }
}

export function getDacExecutablePath(): string | null {
  return DacExecutableService.getInstance().getExecutablePath();
}
