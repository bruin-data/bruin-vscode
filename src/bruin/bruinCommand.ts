import { execFile } from "child_process";
import { removeAnsiColors } from "../utilities/helperUtils";

/** Common functionality used to execute Bruin commands. */
export abstract class BruinCommand {
  /**
   * Initializes a new Bruin command instance.
   *
   * @param bruinExecutable The path to the Bruin executable.
   * @param workingDirectory The path to the directory from which Bruin will be spawned.
   * @param options Command line options that will be passed to Bruin (i.e., --debug).
   */
  public constructor(
    readonly bruinExecutable: string,
    readonly workingDirectory: string,
    readonly options: string[] = []
  ) {}

  /**
   * Overridden by subclasses to provide the Bruin command that should be executed (for example, {@code render}, {@code validate}, or {@code run}).
   */
  protected abstract bruinCommand(): string;

  /** The args used to execute the command. */
  protected execArgs(flags: string[] = []) {
    const args = this.options.concat([this.bruinCommand()]).concat(flags);
    return args;
  }

  /**
   * Executes the command and returns a promise for the binary contents of standard output.
   *
   * @param query The asset to execute.
   * @param options
   * @param options.ignoreErrors `true` if errors from executing the asset should be ignored.
   * @returns A promise that is resolved with the contents of the process's standard output, or rejected if the command fails.
   */
  protected run(
    query: string[],
    { ignoresErrors = false }: { ignoresErrors?: boolean } = {}
  ): Promise<string> {
    console.time("runCommand");
    
    return new Promise<string>((resolve, reject) => {
      const execOptions = {
        cwd: this.workingDirectory,
        maxBuffer: 1024 * 1024 * 50, // Increased to 50MB from 10MB
        timeout: 300000, // Adding 5-minute timeout to prevent hanging processes
      };
      
      console.time("execFile");
      execFile(
        this.bruinExecutable,
        this.execArgs(query),
        execOptions,
        (error: Error | null, stdout: string, stderr: string) => {
          console.timeEnd("execFile");
          
          if (error) {
            console.error("Error executing command:", error);
            console.error("Bruin executable:", this.bruinExecutable);
            
            if (ignoresErrors) {
              resolve("");
            } else {
              reject(removeAnsiColors(stderr || stdout));
            }
          } else {
            resolve(removeAnsiColors(stdout));
          }
        }
      );
    }).finally(() => {
      console.timeEnd("runCommand");
    });
  }
}