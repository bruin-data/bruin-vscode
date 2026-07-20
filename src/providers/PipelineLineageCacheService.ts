import * as vscode from "vscode";
import * as path from "path";

interface CacheEntry {
  raw: string;
  hasColumns: boolean;
}

/**
 * Caches the raw JSON output of `bruin internal parse-pipeline` per pipeline.
 *
 * The parse output is identical no matter which asset in the pipeline is
 * focused, so switching between assets of the same pipeline can reuse a cached
 * result instead of re-running the (expensive, especially with `-c`) CLI parse.
 *
 * Superset rule: a `-c` (with-columns) entry can serve a request that does not
 * need columns, but a no-column entry cannot serve a request that does.
 */
export class PipelineLineageCacheService {
  private static instance: PipelineLineageCacheService;
  private cache = new Map<string, CacheEntry>();

  private constructor() {
    // A different Bruin binary can produce different output, so drop everything.
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

  /**
   * Drop every cached entry for the pipeline rooted at `pipelineDir`. Assets are
   * cached under the pipeline directory while a pipeline.yml is cached under its
   * own file path, so match the directory and anything beneath it.
   */
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
