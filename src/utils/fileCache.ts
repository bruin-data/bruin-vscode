import * as fs from 'fs';
import * as vscode from 'vscode';

interface CacheEntry {
    content: string;
    mtime: number;
    size: number;
}

export class FileContentCache {
    private static instance: FileContentCache;
    private cache = new Map<string, CacheEntry>();
    private readonly maxCacheSize = 1000;
    private readonly cacheTTL = 30000; // 30 seconds

    public static getInstance(): FileContentCache {
        if (!FileContentCache.instance) {
            FileContentCache.instance = new FileContentCache();
        }
        return FileContentCache.instance;
    }

    public async readFile(filePath: string): Promise<string | null> {
        try {
            // Get file stats to check if file has changed
            const stats = await fs.promises.stat(filePath);
            const cached = this.cache.get(filePath);

            // Check if cache is valid (same mtime and size, and not expired)
            const now = Date.now();
            if (cached && 
                cached.mtime === stats.mtimeMs && 
                cached.size === stats.size &&
                (now - cached.mtime) < this.cacheTTL) {
                return cached.content;
            }

            // Read file and update cache
            const content = await fs.promises.readFile(filePath, 'utf8');
            
            // Cleanup cache if too large
            if (this.cache.size >= this.maxCacheSize) {
                this.cleanupCache();
            }

            this.cache.set(filePath, {
                content,
                mtime: stats.mtimeMs,
                size: stats.size
            });

            return content;
        } catch (error) {
            console.error(`[FileContentCache] Error reading file ${filePath}:`, error);
            return null;
        }
    }

    public readFileSync(filePath: string): string | null {
        try {
            // Get file stats to check if file has changed
            const stats = fs.statSync(filePath);
            const cached = this.cache.get(filePath);

            // Check if cache is valid
            const now = Date.now();
            if (cached && 
                cached.mtime === stats.mtimeMs && 
                cached.size === stats.size &&
                (now - cached.mtime) < this.cacheTTL) {
                return cached.content;
            }

            // Read file and update cache
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Cleanup cache if too large
            if (this.cache.size >= this.maxCacheSize) {
                this.cleanupCache();
            }

            this.cache.set(filePath, {
                content,
                mtime: stats.mtimeMs,
                size: stats.size
            });

            return content;
        } catch (error) {
            console.error(`[FileContentCache] Error reading file ${filePath}:`, error);
            return null;
        }
    }

    public invalidate(filePath: string): void {
        this.cache.delete(filePath);
    }

    public clear(): void {
        this.cache.clear();
    }

    public getCacheStats(): { size: number; entries: number } {
        return {
            size: this.cache.size,
            entries: this.cache.size
        };
    }

    private cleanupCache(): void {
        // Remove oldest 25% of entries
        const entriesToRemove = Math.floor(this.cache.size * 0.25);
        const entries = Array.from(this.cache.entries());
        
        // Sort by mtime (oldest first)
        entries.sort((a, b) => a[1].mtime - b[1].mtime);
        
        for (let i = 0; i < entriesToRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }
}

export const fileCache = FileContentCache.getInstance();