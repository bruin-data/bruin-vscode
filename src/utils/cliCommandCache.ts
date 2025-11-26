interface CommandCacheEntry {
    result: string;
    timestamp: number;
    command: string;
    args: string[];
}

interface PendingRequest {
    resolve: (value: string) => void;
    reject: (reason: any) => void;
}

export class CliCommandCache {
    private static instance: CliCommandCache;
    private cache = new Map<string, CommandCacheEntry>();
    private pendingCommands = new Map<string, PendingRequest[]>();
    private readonly maxCacheSize = 500;
    private readonly cacheTTL = 10000; // 10 seconds

    public static getInstance(): CliCommandCache {
        if (!CliCommandCache.instance) {
            CliCommandCache.instance = new CliCommandCache();
        }
        return CliCommandCache.instance;
    }

    public async executeCommand(
        command: string,
        args: string[],
        workingDirectory: string,
        executor: () => Promise<string>
    ): Promise<string> {
        const cacheKey = this.generateCacheKey(command, args, workingDirectory);
        
        // Check if command is already pending
        const pending = this.pendingCommands.get(cacheKey);
        if (pending) {
            // Wait for the pending command to complete
            return new Promise((resolve, reject) => {
                pending.push({ resolve, reject });
            });
        }

        // Check cache first
        const cached = this.cache.get(cacheKey);
        const now = Date.now();
        const ttl = this.getCacheTTL(command, args);
        
        if (cached && (now - cached.timestamp) < ttl) {
            return cached.result;
        }

        // Set up pending request queue
        this.pendingCommands.set(cacheKey, []);

        try {
            // Execute the command
            const result = await executor();
            
            // Cache the result
            if (this.cache.size >= this.maxCacheSize) {
                this.cleanupCache();
            }
            
            this.cache.set(cacheKey, {
                result,
                timestamp: now,
                command,
                args: [...args]
            });

            // Resolve any pending requests
            const pendingList = this.pendingCommands.get(cacheKey) || [];
            pendingList.forEach(pending => pending.resolve(result));
            
            this.pendingCommands.delete(cacheKey);
            
            return result;
            
        } catch (error) {
            // Reject any pending requests
            const pendingList = this.pendingCommands.get(cacheKey) || [];
            pendingList.forEach(pending => pending.reject(error));
            
            this.pendingCommands.delete(cacheKey);
            
            throw error;
        }
    }

    public invalidateByPattern(pattern: RegExp): void {
        const keysToDelete: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
            const fullCommand = `${entry.command} ${entry.args.join(' ')}`;
            if (pattern.test(fullCommand) || pattern.test(key)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    public invalidateByWorkspace(workspacePath: string): void {
        const keysToDelete: string[] = [];
        
        for (const [key] of this.cache.entries()) {
            if (key.includes(workspacePath)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    public clear(): void {
        this.cache.clear();
        this.pendingCommands.clear();
    }

    public getCacheStats(): { size: number; pendingRequests: number } {
        return {
            size: this.cache.size,
            pendingRequests: this.pendingCommands.size
        };
    }

    private generateCacheKey(command: string, args: string[], workingDirectory: string): string {
        // Create a cache key that includes command, args, and workspace
        // Exclude time-sensitive args like timestamps
        const filteredArgs = args.filter(arg => 
            !arg.match(/--start-date|--end-date|\d{4}-\d{2}-\d{2}/)
        );
        
        return `${workingDirectory}:${command}:${filteredArgs.join(':')}`;
    }

    private cleanupCache(): void {
        // Remove oldest 25% of entries
        const entriesToRemove = Math.floor(this.cache.size * 0.25);
        const entries = Array.from(this.cache.entries());
        
        // Sort by timestamp (oldest first)
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < entriesToRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    // Check if a command should be cached (avoid caching commands that modify state)
    public shouldCache(command: string, args: string[]): boolean {
        const fullCommand = `${command} ${args.join(' ')}`;
        
        // Don't cache commands that modify state (excluding validate which is read-only)
        const writeCommands = [
            'run', 'init', 'install', 'format',
            'create', 'update', 'delete', 'patch'
        ];
        
        // Don't cache if it's a write command
        if (writeCommands.some(cmd => fullCommand.includes(cmd))) {
            return false;
        }
        
        // Don't cache if it has date parameters (queries with date ranges)
        if (args.some(arg => arg.match(/--start-date|--end-date/))) {
            return false;
        }
        
        // Cache read-only commands like parse, render, validate, list, etc.
        return true;
    }

    public getCacheTTL(command: string, args: string[]): number {
        const fullCommand = `${command} ${args.join(' ')}`;
        
        // Shorter TTL for validation (changes more frequently)
        if (fullCommand.includes('validate')) {
            return 3000; // 3 seconds
        }
        
        // Longer TTL for stable commands
        if (fullCommand.includes('list-templates') || fullCommand.includes('internal list-templates')) {
            return 60000; // 60 seconds
        }
        
        // Medium TTL for asset metadata and parsing
        if (fullCommand.includes('internal asset-metadata') || fullCommand.includes('internal parse-asset')) {
            return 15000; // 15 seconds
        }
        
        // Default TTL
        return this.cacheTTL;
    }
}

export const cliCommandCache = CliCommandCache.getInstance();