import * as assert from "assert";
import { Workbench } from "vscode-extension-tester";
import { TerminalView } from "vscode-extension-tester";
import "mocha";
import { describe, it } from "mocha";
import * as path from "path";
import * as os from "os";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Sample Command palette tests", function () {
  it("Testing install Bruin CLI command", async function () {
    await new Workbench().executeCommand("Install Bruin CLI");
    await sleep(5000);
    const terminalView = await new TerminalView();
    await terminalView.selectChannel("Bruin Terminal");
    // Determine the full path to the bruin executable
    const bruinExecutable =
      process.platform === "win32"
        ? path.join(os.homedir(), ".local", "bin", "bruin.exe")
        : "bruin";

    // Use Git Bash on Windows
    if (process.platform === "win32") {
      this.skip();
    } else {
      await terminalView.executeCommand(`${bruinExecutable} --version`);
    }

    const terminalOutput = await terminalView.getText();
    console.log(terminalOutput);
    const versionAvailble =
      terminalOutput.includes("Current: ") && terminalOutput.includes("Latest: ");
    assert.strictEqual(versionAvailble, true);
  });

  //test run command with dummy input and delay
  it("Testing run command with dummy call and delay", async function () {
    let bruinExecutable = 'bruin';
    if(process.platform === "win32"){
       bruinExecutable = path.join(os.homedir(), ".local", "bin", "bruin.exe");
    }
    const terminalView = await new TerminalView();
    await terminalView.selectChannel("Bruin Terminal");
    await terminalView.executeCommand(" ");
    await sleep(1000);
    await terminalView.executeCommand(`"${bruinExecutable}" run --help`);
    const terminalOutput = await terminalView.getText();
    console.log("terminal output", terminalOutput);
    const helpAvailable = terminalOutput.includes("bruin run - run a Bruin pipeline");
    assert.strictEqual(helpAvailable, true);
  });
});
