import * as vscode from "vscode";
import * as path from "path";

interface CacheEntry {
  raw: string;
  hasColumns: boolean;
}

/**
 * Caches raw `bruin internal parse-pipeline` output per pipeline so switching
 * assets of the same pipeline reuses it instead of re-running the CLI. A
 * with-columns (`-c`) entry can serve a no-column request, but not vice versa.
 */
export class PipelineLineageCacheService {
  private static instance: PipelineLineageCacheService;
  private cache = new Map<string, CacheEntry>();

  private constructor() {
    // A different Bruin binary can produce different output.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("bruin.executable")) {
        this.invalidateAll();
      }
    });
  }

  public static getInstance(): PipelineLineageCacheService {
    if (!PipelineLineageCacheService.instance) {
      PipelineLineageCacheService.instance = new PipelineLineageCacheService();
    }
    return PipelineLineageCacheService.instance;
  }

  public get(pipelinePath: string, needColumns: boolean): string | undefined {
    const entry = this.cache.get(pipelinePath);
    if (!entry) {
      return undefined;
    }
    if (needColumns && !entry.hasColumns) {
      return undefined;
    }
    return entry.raw;
  }

  public set(pipelinePath: string, raw: string, hasColumns: boolean): void {
    const existing = this.cache.get(pipelinePath);
    // Never downgrade a with-columns entry to a no-column one.
    if (existing?.hasColumns && !hasColumns) {
      return;
    }
    this.cache.set(pipelinePath, { raw, hasColumns });
  }

  /** Drop cached entries for the pipeline rooted at `pipelineDir`. */
  public invalidate(pipelineDir: string): void {
    for (const key of this.cache.keys()) {
      if (key === pipelineDir || key.startsWith(pipelineDir + path.sep) || key.startsWith(pipelineDir + "/")) {
        this.cache.delete(key);
      }
    }
  }

  public invalidateAll(): void {
    this.cache.clear();
  }
}

export function getPipelineLineageCache(): PipelineLineageCacheService {
  return PipelineLineageCacheService.getInstance();
}
