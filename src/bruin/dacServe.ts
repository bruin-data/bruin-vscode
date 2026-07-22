import * as child_process from "child_process";
import * as http from "http";
import * as net from "net";
import * as path from "path";
import * as vscode from "vscode";
import { getDacExecutablePath } from "../providers/DacExecutableService";
import { getBruinExecutablePath } from "../providers/BruinExecutableService";

/**
 * dac serve shells out to the `bruin` CLI to run queries. The extension host's
 * PATH may not include bruin (notably on Windows), so prepend the resolved bruin
 * directory — mirroring how the extension runs bruin itself.
 */
function envWithBruinOnPath(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const bruinDir = path.dirname(getBruinExecutablePath());
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH") || "PATH";
  env[key] = bruinDir + path.delimiter + (env[key] || "");
  return env;
}

/** Spawns and supervises a long-running `dac serve --dir <dir> --port <port>`. */
export class DacServe {
  private process: child_process.ChildProcess | undefined;
  private readonly output: vscode.OutputChannel;
  private readonly executable: string;
  // Recent stdout/stderr lines, kept so a startup failure can report the real
  // reason dac exited instead of a generic "exited before becoming ready".
  private recentOutput: string[] = [];
  private spawnError: Error | undefined;
  private exitInfo: { code: number | null; signal: NodeJS.Signals | null } | undefined;

  public readonly port: number;
  public readonly dir: string;
  public readonly host: string = "127.0.0.1";
  public readonly template: string;

  constructor(
    dir: string,
    port: number,
    output: vscode.OutputChannel,
    template: string = "bruin",
    executable: string = "dac"
  ) {
    this.dir = dir;
    this.port = port;
    this.output = output;
    this.template = template;
    this.executable = executable;
  }

  public get url(): string {
    return `http://${this.host}:${this.port}`;
  }

  public get isRunning(): boolean {
    return !!this.process && this.process.exitCode === null;
  }

  /** Picks an unused TCP port from the OS. */
  public static async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.unref();
      srv.on("error", reject);
      srv.listen(0, "127.0.0.1", () => {
        const addr = srv.address();
        if (addr && typeof addr === "object") {
          const port = addr.port;
          srv.close(() => resolve(port));
        } else {
          srv.close(() => reject(new Error("Failed to obtain free port")));
        }
      });
    });
  }

  /** Spawns dac and resolves once it's accepting requests on the port. */
  public async start(): Promise<void> {
    const args = [
      "serve",
      "--dir", this.dir,
      "--port", String(this.port),
      "--host", this.host,
      "--template", this.template,
    ];
    this.output.appendLine(`[dac] $ ${this.executable} ${args.join(" ")}`);

    this.process = child_process.spawn(this.executable, args, {
      cwd: this.dir,
      env: envWithBruinOnPath(),
    });

    const capture = (line: string) => {
      this.recentOutput.push(line);
      if (this.recentOutput.length > 40) {
        this.recentOutput.shift();
      }
    };

    this.process.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      this.output.append(`[dac] ${text}`);
      capture(text.trimEnd());
    });
    this.process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      this.output.append(`[dac:err] ${text}`);
      capture(text.trimEnd());
    });
    this.process.on("error", (err) => {
      this.spawnError = err;
      this.output.appendLine(`[dac] process error: ${err.message}`);
    });
    this.process.on("exit", (code, signal) => {
      this.exitInfo = { code, signal };
      this.output.appendLine(`[dac] exited (code=${code}, signal=${signal})`);
    });

    await this.waitUntilReady();
  }

  /** The last few lines dac printed — used to explain a startup failure. */
  private tail(): string {
    const text = this.recentOutput.join("\n").trim();
    return text ? `\n${text}` : "";
  }

  private async waitUntilReady(timeoutMs: number = 15000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.spawnError) {
        throw new DacStartError(`Could not launch dac: ${this.spawnError.message}`, this.tail());
      }
      if (!this.process || this.process.exitCode !== null) {
        const code = this.exitInfo?.code ?? this.process?.exitCode ?? "unknown";
        throw new DacStartError(`dac exited (code=${code}) before it was ready.`, this.tail());
      }
      const reachable = await this.ping();
      if (reachable) {
        this.output.appendLine(`[dac] ready at ${this.url}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new DacStartError(`dac did not become ready within ${timeoutMs}ms.`, this.tail());
  }

  private ping(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get({ host: this.host, port: this.port, path: "/", timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public stop(): void {
    if (!this.process || this.process.exitCode !== null) {
      return;
    }
    this.output.appendLine(`[dac] stopping`);
    try {
      this.process.kill("SIGTERM");
    } catch (err) {
      this.output.appendLine(`[dac] kill failed: ${(err as Error).message}`);
    }
    // Hard kill fallback if it doesn't exit cleanly.
    const proc = this.process;
    setTimeout(() => {
      if (proc.exitCode === null) {
        try {
          proc.kill("SIGKILL");
        } catch {
          /* noop */
        }
      }
    }, 2000);
    this.process = undefined;
  }
}

/** Raised when the `dac` executable can't be located (callers offer install help). */
export class DacNotFoundError extends Error {
  public readonly isDacNotFound = true;
  constructor() {
    super(
      "Could not find the 'dac' executable. Install it, or set 'bruin.dac.executable' to its full path."
    );
    this.name = "DacNotFoundError";
  }
}

/** Raised when `dac serve` failed to come up; `details` carries dac's own output. */
export class DacStartError extends Error {
  public readonly details: string;
  constructor(message: string, details: string = "") {
    super(details ? `${message}${details}` : message);
    this.name = "DacStartError";
    this.details = details.trim();
  }
  /** True when the failure looks like a transient port collision worth retrying. */
  public get isPortInUse(): boolean {
    return /address already in use|bind|in use|EADDRINUSE/i.test(this.details);
  }
}

interface SharedServer {
  /** Resolves to the ready server. Stored synchronously so concurrent
   *  acquires for the same dir await one start instead of racing two. */
  promise: Promise<DacServe>;
  server?: DacServe;
  refCount: number;
}

/**
 * Ref-counted `dac serve` process per dashboard directory: acquire starts it on
 * first use, release stops it when the last panel closes. Avoids leaking ports.
 */
export class DacServerManager {
  private static servers: Map<string, SharedServer> = new Map();

  /**
   * Returns a ready DacServe for `dir`; pair each acquire with one release(dir).
   * @throws {DacNotFoundError} when the dac executable cannot be resolved.
   */
  public static async acquire(
    dir: string,
    output: vscode.OutputChannel,
    template: string
  ): Promise<DacServe> {
    const existing = DacServerManager.servers.get(dir);
    if (existing) {
      existing.refCount += 1;
      output.appendLine(`[dac] reusing server for ${dir} (refs=${existing.refCount})`);
      return existing.promise;
    }

    const executable = getDacExecutablePath();
    if (!executable) {
      throw new DacNotFoundError();
    }

    // Register the entry synchronously (with a pending promise) so a second
    // acquire for the same dir joins this start instead of spawning its own.
    let entry!: SharedServer;
    const promise = DacServerManager.startServer(dir, output, template, executable).then(
      (server) => {
        entry.server = server;
        return server;
      }
    );
    entry = { refCount: 1, promise };
    DacServerManager.servers.set(dir, entry);

    try {
      return await entry.promise;
    } catch (err) {
      DacServerManager.servers.delete(dir);
      throw err;
    }
  }

  /**
   * Starts a `dac serve`, retrying only on a transient port collision
   * (findFreePort → bind is a TOCTOU window); real failures throw immediately.
   */
  private static async startServer(
    dir: string,
    output: vscode.OutputChannel,
    template: string,
    executable: string
  ): Promise<DacServe> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const port = await DacServe.findFreePort();
      const server = new DacServe(dir, port, output, template, executable);
      try {
        await server.start();
        return server;
      } catch (err) {
        lastError = err;
        server.stop();
        if (err instanceof DacStartError && err.isPortInUse && attempt < 3) {
          output.appendLine(`[dac] port ${port} was taken, retrying on a new port…`);
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /** Decrements the ref-count for `dir`, stopping the server at zero. */
  public static release(dir: string): void {
    const entry = DacServerManager.servers.get(dir);
    if (!entry) {
      return;
    }
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      DacServerManager.servers.delete(dir);
      // Stop once the start settles — covers release during a pending start.
      entry.promise.then((s) => s.stop()).catch(() => {});
    }
  }

  /** Stops every running server. Call on extension deactivate. */
  public static disposeAll(): void {
    for (const entry of DacServerManager.servers.values()) {
      entry.promise.then((s) => s.stop()).catch(() => {});
    }
    DacServerManager.servers.clear();
  }
}
