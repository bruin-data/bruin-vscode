// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from "child_process";
import { removeAnsiColors } from "../utilities/helperUtils";

/** Common functionality used to execute Bruin commands. */
export abstract class BruinCommand {
  /** Flag to disable logging during tests */
  public static isTestMode = false;

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
    
    if (!BruinCommand.isTestMode) {
      console.log(`[${new Date().toISOString()}] Starting command: ${commandString}`);
    }
    
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
          
          if (!BruinCommand.isTestMode) {
            console.log(`[${new Date().toISOString()}] Command completed in ${duration}ms  ${commandString}`);
          }

          if (error) {
            if (!BruinCommand.isTestMode) {
              console.error(`[${new Date().toISOString()}] Command failed after ${duration}ms:`, error.message);
            }
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
   * Returns both the promise, process, and console messages for cancellation.
   */
  protected runCancellable(
    query: string[],
    { 
      ignoresErrors = false, 
    }: { 
      ignoresErrors?: boolean; 
    } = {}
  ): { promise: Promise<string>; process: child_process.ChildProcess; consoleMessages: Array<{type: 'stdout' | 'stderr' | 'info', message: string, timestamp: string}> } {
    const startTime = Date.now();
    const commandString = `${this.bruinExecutable} ${this.execArgs(query).join(' ')}`;
    
    if (!BruinCommand.isTestMode) {
      console.log(`[${new Date().toISOString()}] Starting command: ${commandString}`);
    }
    
    const consoleMessages: Array<{type: 'stdout' | 'stderr' | 'info', message: string, timestamp: string}> = [];
    const MAX_CONSOLE_MESSAGES = 1000;
    
    const addConsoleMessage = (message: {type: 'stdout' | 'stderr' | 'info', message: string, timestamp: string}) => {
      consoleMessages.push(message);
      if (consoleMessages.length > MAX_CONSOLE_MESSAGES) {
        consoleMessages.shift(); // Remove oldest message
      }
    };
    
    // Add initial command start message
    addConsoleMessage({
      type: 'info',
      message: `Starting command: ${commandString}`,
      timestamp: new Date().toISOString()
    });
    
    const proc = child_process.spawn(this.bruinExecutable, this.execArgs(query), {
      cwd: this.workingDirectory,
    });

    const promise = new Promise<string>((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        
        // Capture stdout messages
        const timestamp = new Date().toISOString();
        const lines = output.trim().split('\n').filter((line: string) => line.length > 0);
        lines.forEach((line: string) => {
          addConsoleMessage({
            type: 'stdout',
            message: line,
            timestamp
          });
        });
      });

      proc.stderr?.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        
        // Capture stderr messages
        const timestamp = new Date().toISOString();
        const lines = output.trim().split('\n').filter((line: string) => line.length > 0);
        lines.forEach((line: string) => {
          addConsoleMessage({
            type: 'stderr',
            message: line,
            timestamp
          });
        });
      });

      proc.on("close", (code, signal) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (!BruinCommand.isTestMode) {
          console.log(`[${new Date().toISOString()}] Command completed in ${duration}ms ${commandString}`);
        }
        
        // Add completion message
        addConsoleMessage({
          type: 'info',
          message: `Command completed in ${duration}ms with exit code ${code}`,
          timestamp: new Date().toISOString()
        });

        if (signal === "SIGINT" || signal === "SIGTERM") {
          addConsoleMessage({
            type: 'info',
            message: `Command was cancelled (signal: ${signal})`,
            timestamp: new Date().toISOString()
          });
          reject(new Error("Command was cancelled"));
        } else if (code === 0) {
          resolve(removeAnsiColors(stdout));
        } else {
          if (!BruinCommand.isTestMode) {
            console.error(`[${new Date().toISOString()}] Command failed after ${duration}ms:`, stderr || stdout);
          }
          addConsoleMessage({
            type: 'stderr',
            message: `Command failed with exit code ${code}`,
            timestamp: new Date().toISOString()
          });
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
        addConsoleMessage({
          type: 'stderr',
          message: `Process error: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        reject(error);
      });
    });

    return { promise, process: proc, consoleMessages };
  }
}
