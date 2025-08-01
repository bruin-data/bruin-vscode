// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from "child_process";
import { removeAnsiColors } from "../utilities/helperUtils";

/** Common functionality used to execute Bruin commands. */
export abstract class BruinCommand {
  /**
   * Initializes a new Bruin command instance.
   *
   * @param bruinExecutable The path to the Bruin executable.
   * @param workingDirectory The path to the directory from which Bruin will be
   * spawned.
   * @param options Command line options that will be passed to Bruin (i.e: --debug).
   */
  public constructor(
    readonly bruinExecutable: string,
    readonly workingDirectory: string,
    readonly options: string[] = []
  ) {}

  /**
   * Overridden by subclasses to provide the Bruin command that should be
   * executed (for example, {@code render}, {@code validate}, or {@code run}).
   */
  protected abstract bruinCommand(): string;

  /** The args used to execute the for the command. */
  protected execArgs(flags: string[] = []) {
    const args = this.options.concat([this.bruinCommand()]).concat(flags);
    return args;
  }

  /**
   * Executes the command and returns a promise for the binary contents of
   * standard output.
   *
   * @param query The asset to execute.
   * @param options
   * @param options.ignoresErrors `true` if errors from executing the asset
   * should be ignored.
   * @returns A promise that is resolved with the contents of the process's
   * standard output, or rejected if the command fails.
   */
  protected run(
    query: string[],
    { 
      ignoresErrors = false, 
    }: { 
      ignoresErrors?: boolean; 
    } = {}
  ): Promise<string> {
    const startTime = Date.now();
    const commandString = `${this.bruinExecutable} ${this.execArgs(query).join(' ')}`;
    
    console.log(`[${new Date().toISOString()}] Starting command: ${commandString}`);
    
    return new Promise((resolve, reject) => {
      const execOptions = {
        cwd: this.workingDirectory,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      };

      child_process.execFile(
        this.bruinExecutable,
        this.execArgs(query),
        execOptions,
        (error: Error | null, stdout: string, stderr: string) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          console.log(`[${new Date().toISOString()}] Command completed in ${duration}ms  ${commandString}`);

          if (error) {
            console.error(`[${new Date().toISOString()}] Command failed after ${duration}ms:`, error.message);
            if (ignoresErrors) {
              resolve("");
            } else {
              reject(removeAnsiColors(stderr ? stderr : stdout));
            }
          } else {
            resolve(removeAnsiColors(stdout.toString()));
          }
        }
      );
    });
  }

  /**
   * Executes the command with cancellation support.
   * Returns both the promise and the child process for cancellation.
   */
  protected runCancellable(
    query: string[],
    { 
      ignoresErrors = false, 
    }: { 
      ignoresErrors?: boolean; 
    } = {}
  ): { promise: Promise<string>; process: child_process.ChildProcess } {
    const startTime = Date.now();
    const commandString = `${this.bruinExecutable} ${this.execArgs(query).join(' ')}`;
    
    console.log(`[${new Date().toISOString()}] Starting command: ${commandString}`);
    
    const proc = child_process.spawn(this.bruinExecutable, this.execArgs(query), {
      cwd: this.workingDirectory,
    });

    const promise = new Promise<string>((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code, signal) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`[${new Date().toISOString()}] Command completed in ${duration}ms ${commandString}`);

        if (signal === "SIGINT" || signal === "SIGTERM") {
          reject(new Error("Command was cancelled"));
        } else if (code === 0) {
          resolve(removeAnsiColors(stdout));
        } else {
          console.error(`[${new Date().toISOString()}] Command failed after ${duration}ms:`, stderr || stdout);
          if (ignoresErrors) {
            resolve("");
          } else {
            reject(removeAnsiColors(stderr || stdout));
          }
        }
      });

      proc.on("error", (error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.error(`[${new Date().toISOString()}] Command failed after ${duration}ms:`, error.message);
        reject(error);
      });
    });

    return { promise, process: proc };
  }
}
