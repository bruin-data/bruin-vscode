const { parse } = require("path");

  execFile  = require("child_process");

/** Common functionality used to execute Bruin commands. */
 class BruinCommand {
  /**
   * Initializes a new Bruin command instance.
   *
   * @param bruinExecutable The path to the Bruin executable.
   * @param workingDirectory The path to the directory from which Bruin will be spawned.
   * @param options Command line options that will be passed to Bruin (i.e., --debug).
   */
   constructor(
     bruinExecutable,
     workingDirectoryring,
     options = []
  ) {}

  /**
   * Overridden by subclasses to provide the Bruin command that should be executed (for example, {@code render}, {@code validate}, or {@code run}).
   */

  /** The args used to execute the command. */
   execArgs(flags = []) {
    const args = ["internal parse-assset", ...flags];
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
   run(
    query,
    { ignoresErrors = false }= {}
  ) {
    console.time("runCommand");
    
      const execOptions = {
        cwd: this.workingDirectory,
        maxBuffer: 1024 * 1024 * 50, // Increased to 50MB from 10MB
        timeout: 300000, // Adding 5-minute timeout to prevent hanging processes
      };
      
      console.time("execFile");
      execFile.execFile(
        "/Users/djamilabaroudi/.local/bin/bruin",
        ["internal", "parse-asset", "/Users/djamilabaroudi/Desktop/bruin-test/pipeline-one/assets/test5.sql"],
        execOptions,
        (error, stdout, stderr) => {
          console.timeEnd("execFile");
          
          if (error) {
            console.error("Error executing command:", error);
            console.error("Bruin executable:", this.bruinExecutable);
            
            if (ignoresErrors) {
              console.error("Ignoring error as per options.");
             
            } else {
              console.error("Error executing command:", error);
            }
          } else {
          }
        }
      );
    
      console.timeEnd("runCommand");
  }
}



 class BruinInternalParse extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'run' command string.
   */
   bruinCommand() {
    return "internal";
  }

  /**
   * Run a Bruin Asset based on it's path with optional flags and error handling.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {string} filePath - The path of the asset to be run.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */

   async parseAsset(
    filePath,
    { flags = ["parse-asset"], ignoresErrors = false } = {}
  ) {
    console.time("parseAsset");
      console.time("defaultParse");
      // Default: original asset logic
       this.run([...flags, filePath], { ignoresErrors })
     
      console.timeEnd("parseAsset");

}
 }
parseAssetCon = new BruinInternalParse(
  "/Users/djamilabaroudi/Desktop/bruin-test/pipeline-one/assets/test5.sql",
  "/Users/djamilabaroudi/.local/bin/bruin",
);
parseAssetCon.parseAsset(
  "/Users/djamilabaroudi/Desktop/bruin-test/pipeline-one/assets/test5.sql",
  { flags: ["--debug"], ignoresErrors: false }
);

console.log("the file is correctly parsed")
