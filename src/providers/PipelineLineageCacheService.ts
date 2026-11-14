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
  // Disk-change count per pipeline that has been parsed or is being parsed.
  private diskGenerations = new Map<string, number>();
  private readonly diskInvalidation = new vscode.EventEmitter<string[]>();
  /** Fires with the parsed pipeline directories whose files changed on disk. */
  public readonly onDidInvalidateFromDisk = this.diskInvalidation.event;

  private constructor() {
    // A different Bruin binary can produce different output.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("bruin.executable")) {
        this.invalidateAll();
      }
    });

    // Files written outside the editor (CLI, git checkout, scripts, agents)
    // raise no onDidChangeTextDocument, so watch asset and pipeline files on disk.
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.{sql,py,r,R,yml,yaml}");
    // Pipelines with a parse in flight count too: the parse may have read the
    // files before this change, so its result must not be cached.
    const onDiskChange = (uri: vscode.Uri) => {
      const changed = [...this.diskGenerations.keys()].filter((dir) => isInsideDir(uri.fsPath, dir));
      if (changed.length) {
        for (const dir of changed) {
          this.diskGenerations.set(dir, this.diskGenerations.get(dir)! + 1);
          this.cache.delete(dir);
        }
        this.diskInvalidation.fire(changed);
      }
    };
    watcher.onDidCreate(onDiskChange);
    watcher.onDidChange(onDiskChange);
    watcher.onDidDelete(onDiskChange);
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

  /**
   * Call before parsing a pipeline and pass the result to `set`, so a parse
   * that overlapped a disk change of that pipeline is not cached.
   */
  public diskGeneration(pipelinePath: string): number {
    if (!this.diskGenerations.has(pipelinePath)) {
      this.diskGenerations.set(pipelinePath, 0);
    }
    return this.diskGenerations.get(pipelinePath)!;
  }

  public set(pipelinePath: string, raw: string, hasColumns: boolean, diskGeneration: number): void {
    if (diskGeneration !== this.diskGenerations.get(pipelinePath)) {
      return;
    }
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

export function isInsideDir(filePath: string, dir: string): boolean {
  const relative = path.relative(dir, filePath);
  return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

export function getPipelineLineageCache(): PipelineLineageCacheService {
  return PipelineLineageCacheService.getInstance();
}
