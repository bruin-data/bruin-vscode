import * as vscode from "vscode";
import path = require("path");
import * as fs from "fs";
import * as os from "os";

/**
 * BruinExecutableService - A singleton service for managing Bruin executable path
 * This service ensures the Bruin executable path is cached and only recomputed when necessary
 */
export class BruinExecutableService {
  private static instance: BruinExecutableService;
  private cachedExecutablePath: string | null = null;
  private lastConfigCheckTime: number = 0;
  private readonly CONFIG_CACHE_SEC = 300; 
  
  private constructor() {
    // Subscribe to configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("bruin.executable")) {
        this.invalidateCache();
      }
    });
  }

  /**
   * Get the singleton instance of BruinExecutableService
   */
  public static getInstance(): BruinExecutableService {
    if (!BruinExecutableService.instance) {
      BruinExecutableService.instance = new BruinExecutableService();
    }
    return BruinExecutableService.instance;
  }

  /**
   * Get the Bruin executable path, using cache if available
   */
  public getExecutablePath(): string {
    const currentTime = Date.now();
    
    // Return cached value if it exists and is still valid
    if (this.cachedExecutablePath !== null && 
        (currentTime - this.lastConfigCheckTime) < this.CONFIG_CACHE_SEC) {
      return this.cachedExecutablePath;
    }
    
    // Update the last check time
    this.lastConfigCheckTime = currentTime;
    
    let bruinExecutable = "";
    const bruinConfig = vscode.workspace.getConfiguration("bruin");
    bruinExecutable = bruinConfig.get<string>("executable") || "";

    if (bruinExecutable.length > 0) {
      // If a path is provided, use it
      console.log(`Using custom Bruin executable at ${bruinExecutable}`);
      this.cachedExecutablePath = bruinExecutable;
      return bruinExecutable;
    } else {
      // Attempt to find 'bruin' in the system's PATH (works for Git Bash)
      const paths = (process.env.PATH || "").split(path.delimiter);
      for (const p of paths) {
        const executablePath = path.join(p, process.platform === "win32" ? "bruin.exe" : "bruin");
        try {
          // Test if the file exists and is executable
          fs.accessSync(executablePath, fs.constants.X_OK);
          console.log(`Found 'bruin' at ${executablePath}`);
          bruinExecutable = executablePath;
          this.cachedExecutablePath = bruinExecutable;
          return bruinExecutable;
        } catch (err) {
          // Continue searching if not found or not executable
          continue;
        }
      }
      // If all else fails, check in ~/.local/bin for Windows (Git Bash)
      if (process.platform === "win32") {
        const homePath = os.homedir();
        const localBinPath = path.join(homePath, ".local", "bin");
        const executablePathLocal = path.join(localBinPath, "bruin.exe");
        try {
          fs.accessSync(executablePathLocal, fs.constants.X_OK);
          bruinExecutable = executablePathLocal;
          this.cachedExecutablePath = bruinExecutable;
          return bruinExecutable;
        } catch (err) {
          // Continue searching if not found or not executable
        }
      }
      // If all else fails, provide a meaningful message or default
      console.log("Could not find 'bruin' in PATH. Using 'bruin' as the default executable.");
      // look for bruin in the PATH
      const homePath = os.homedir();
      const localBinPath = path.join(homePath, ".local", "bin");
      bruinExecutable = path.join(localBinPath, "bruin");
      console.log(`Using 'bruin' by joining the path: ${localBinPath}`);
      this.cachedExecutablePath = bruinExecutable;
      return bruinExecutable;
    }
  }

  /**
   * Force refresh the cached Bruin executable path
   */
  public invalidateCache(): void {
    this.cachedExecutablePath = null;
    this.lastConfigCheckTime = 0;
  }
}

// Export a convenience function to get the executable path
export function getBruinExecutablePath(): string {
  console.time("getBruinExecutablePath");
  const bruinExecutablePath = BruinExecutableService.getInstance().getExecutablePath();
  console.timeEnd("getBruinExecutablePath");
  return bruinExecutablePath;
}

// Export a function to invalidate the cache
export function invalidateBruinExecutableCache(): void {
  BruinExecutableService.getInstance().invalidateCache();
}