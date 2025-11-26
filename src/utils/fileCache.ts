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
            const cached = this.cache.get(filePath);
            const now = Date.now();

            // If we have a recent cache entry, check if it's still fresh
            if (cached && (now - cached.mtime) < this.cacheTTL) {
                // Only stat if cache is getting old (last 5 seconds of TTL)
                if ((now - cached.mtime) < (this.cacheTTL - 5000)) {
                    return cached.content;
                }
            }

            // Get file stats to check if file has changed
            const stats = await fs.promises.stat(filePath);

            // Check if cache is valid (same mtime and size)
            if (cached && 
                cached.mtime === stats.mtimeMs && 
                cached.size === stats.size) {
                // Update timestamp to extend cache life
                cached.mtime = now;
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
            const cached = this.cache.get(filePath);
            const now = Date.now();

            // If we have a recent cache entry, avoid stat calls
            if (cached && (now - cached.mtime) < this.cacheTTL) {
                // Only stat if cache is getting old (last 5 seconds of TTL)
                if ((now - cached.mtime) < (this.cacheTTL - 5000)) {
                    return cached.content;
                }
            }

            // Get file stats to check if file has changed
            const stats = fs.statSync(filePath);

            // Check if cache is valid (same mtime and size)
            if (cached && 
                cached.mtime === stats.mtimeMs && 
                cached.size === stats.size) {
                // Update timestamp to extend cache life
                cached.mtime = now;
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