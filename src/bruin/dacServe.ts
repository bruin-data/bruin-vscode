import * as child_process from "child_process";
import * as http from "http";
import * as net from "net";
import * as vscode from "vscode";
import { getDacExecutablePath } from "../providers/DacExecutableService";

/**
 * Spawns and supervises a `dac serve --dir <dir> --port <port>` process for the
 * Dashboard Preview panel. Modeled loosely after BruinValidate but for a
 * long-running server process instead of a one-shot command.
 */
export class DacServe {
  private process: child_process.ChildProcess | undefined;
  private readonly output: vscode.OutputChannel;
  private readonly executable: string;

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

  /**
   * Picks an unused TCP port by asking the OS for one.
   */
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

  /**
   * Spawns the dac process and resolves once the HTTP server is accepting
   * requests on the chosen port.
   */
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
      env: process.env,
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      this.output.append(`[dac] ${data.toString()}`);
    });
    this.process.stderr?.on("data", (data: Buffer) => {
      this.output.append(`[dac:err] ${data.toString()}`);
    });
    this.process.on("error", (err) => {
      this.output.appendLine(`[dac] process error: ${err.message}`);
    });
    this.process.on("exit", (code, signal) => {
      this.output.appendLine(`[dac] exited (code=${code}, signal=${signal})`);
    });

    await this.waitUntilReady();
  }

  private async waitUntilReady(timeoutMs: number = 15000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!this.process || this.process.exitCode !== null) {
        throw new Error("dac process exited before becoming ready");
      }
      const reachable = await this.ping();
      if (reachable) {
        this.output.appendLine(`[dac] ready at ${this.url}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`dac did not become ready within ${timeoutMs}ms`);
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

/**
 * Raised when the `dac` executable cannot be located. Carries a flag so callers
 * can offer install guidance rather than treating it as a generic spawn error.
 */
export class DacNotFoundError extends Error {
  public readonly isDacNotFound = true;
  constructor() {
    super(
      "Could not find the 'dac' executable. Install it, or set 'bruin.dac.executable' to its full path."
    );
    this.name = "DacNotFoundError";
  }
}

interface SharedServer {
  server: DacServe;
  refCount: number;
}

/**
 * Reuses a single `dac serve` process per dashboard directory across panels.
 * Acquire bumps a ref-count (starting the server on first acquire); release
 * decrements it and stops the server when the last panel for that directory
 * closes. This avoids spawning a fresh server — and leaking a port — every
 * time the preview is opened.
 */
export class DacServerManager {
  private static servers: Map<string, SharedServer> = new Map();

  /**
   * Returns a ready DacServe for `dir`, starting one if needed. The caller must
   * pair every successful acquire with exactly one release(dir).
   *
   * @throws {DacNotFoundError} when the dac executable cannot be resolved.
   */
  public static async acquire(
    dir: string,
    output: vscode.OutputChannel,
    template: string
  ): Promise<DacServe> {
    const existing = DacServerManager.servers.get(dir);
    if (existing && existing.server.isRunning) {
      existing.refCount += 1;
      output.appendLine(`[dac] reusing server for ${dir} (refs=${existing.refCount})`);
      return existing.server;
    }

    const executable = getDacExecutablePath();
    if (!executable) {
      throw new DacNotFoundError();
    }

    const port = await DacServe.findFreePort();
    const server = new DacServe(dir, port, output, template, executable);
    await server.start();

    DacServerManager.servers.set(dir, { server, refCount: 1 });
    return server;
  }

  /**
   * Decrements the ref-count for `dir`, stopping the server when it reaches zero.
   */
  public static release(dir: string): void {
    const entry = DacServerManager.servers.get(dir);
    if (!entry) {
      return;
    }
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      entry.server.stop();
      DacServerManager.servers.delete(dir);
    }
  }

  /** Stops every running server. Call on extension deactivate. */
  public static disposeAll(): void {
    for (const { server } of DacServerManager.servers.values()) {
      server.stop();
    }
    DacServerManager.servers.clear();
  }
}
