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
    console.log(this.options.concat([this.bruinCommand()]).concat(flags));
    return this.options.concat([this.bruinCommand()]).concat(flags);
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
    { ignoresErrors = false }: { ignoresErrors?: boolean } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const execOptions = {
        cwd: this.workingDirectory,
      };
      child_process.execFile(
        this.bruinExecutable,
        this.execArgs(query),
        execOptions,
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
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
}
