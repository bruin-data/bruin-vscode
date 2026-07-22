import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";

/** Dashboard Preview needs the CORS middleware added to `dac serve` in this release. */
export const MIN_DAC_VERSION = "0.7.0";

/** True unless `version` is a parseable semver older than MIN_DAC_VERSION (dev/unknown pass). */
export function isDacVersionSupported(version: string | null): boolean {
  if (!version) {
    return true;
  }
  const cur = version.split(".").map(Number);
  const min = MIN_DAC_VERSION.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (cur[i] !== min[i]) {
      return cur[i] > min[i];
    }
  }
  return true;
}

/**
 * Singleton resolving the `dac` executable: `bruin.dac.executable` setting, then
 * PATH and common install dirs. Returns null when not found so callers can warn.
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

  /** Resolves the dac executable to an absolute path, or null. Cached for CONFIG_CACHE_MS. */
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

  /** Runs `dac --version` and returns the parsed x.y.z, or null (dev/unknown/unresolved). */
  public async getVersion(): Promise<string | null> {
    const exe = this.getExecutablePath();
    if (!exe) {
      return null;
    }
    return new Promise((resolve) => {
      execFile(exe, ["--version"], { timeout: 5000 }, (err, stdout) => {
        const m = err ? null : /(\d+)\.(\d+)\.(\d+)/.exec(stdout || "");
        resolve(m ? `${m[1]}.${m[2]}.${m[3]}` : null);
      });
    });
  }
}

export function getDacExecutablePath(): string | null {
  return DacExecutableService.getInstance().getExecutablePath();
}
