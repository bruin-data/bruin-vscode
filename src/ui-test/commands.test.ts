import * as assert from "assert";
import { Workbench } from "vscode-extension-tester";
import { TerminalView } from "vscode-extension-tester";
import "mocha";
import { describe, it } from "mocha";
import * as path from "path";
import * as os from "os";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Sample Command palette tests", function () {
  it("Testing install Bruin CLI command", async () => {
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
      await terminalView.executeCommand(`"${bruinExecutable}" --version`);
    } else {
      await terminalView.executeCommand(`${bruinExecutable} --version`);
    }
    //await terminalView.executeCommand("bruin --version");
    const terminalOutput = await terminalView.getText();
    console.log(terminalOutput);
    const versionAvailble =
      terminalOutput.includes("Current: ") && terminalOutput.includes("Latest: ");
    //assert.strictEqual(versionAvailble, true);
  });
});
