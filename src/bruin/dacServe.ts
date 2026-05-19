import * as child_process from "child_process";
import * as http from "http";
import * as net from "net";
import * as vscode from "vscode";

/**
 * Spawns and supervises a `dac serve --dir <dir> --port <port>` process for the
 * Dashboard Preview panel. Minimal POC wrapper — modeled loosely after
 * BruinValidate but for a long-running server process instead of a one-shot
 * command.
 */
export class DacServe {
  private process: child_process.ChildProcess | undefined;
  private readonly output: vscode.OutputChannel;

  public readonly port: number;
  public readonly dir: string;
  public readonly host: string = "127.0.0.1";
  public readonly template: string;

  constructor(dir: string, port: number, output: vscode.OutputChannel, template: string = "bruin") {
    this.dir = dir;
    this.port = port;
    this.output = output;
    this.template = template;
  }

  public get url(): string {
    return `http://${this.host}:${this.port}`;
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
  public async start(executable: string = "dac"): Promise<void> {
    const args = [
      "serve",
      "--dir", this.dir,
      "--port", String(this.port),
      "--host", this.host,
      "--template", this.template,
    ];
    this.output.appendLine(`[dac] $ ${executable} ${args.join(" ")}`);

    this.process = child_process.spawn(executable, args, {
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
