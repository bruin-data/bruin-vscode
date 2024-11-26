/* eslint-disable @typescript-eslint/naming-convention */
import * as assert from "assert";
import * as vscode from "vscode";
import * as os from "os";
import * as util from "util";
const proxyquire = require("proxyquire");

import {
  isFileExtensionSQL,
  isPythonBruinAsset,
  isBruinPipeline,
  isBruinYaml,
  encodeHTML,
  removeAnsiColors,
  processLineageData,
  getFileExtension,
  extractNonNullConnections,
} from "../utilities/helperUtils";
import * as configuration from "../extension/configuration";
import * as bruinUtils from "../bruin/bruinUtils";
import * as fs from "fs";
import path = require("path");
import sinon = require("sinon");
import {
  BruinInstallCLI,
  bruinWorkspaceDirectory,
  findGitBashPath,
  replacePathSeparator,
} from "../bruin/bruinUtils";
import { BruinInternalPatch } from "../bruin/bruinInternalPatch";
import { getPathSeparator } from "../extension/configuration";
import { BruinCommand } from "../bruin/bruinCommand";
import {
  BruinConnections,
  BruinCreateConnection,
  BruinDeleteConnection,
  BruinGetAllBruinConnections,
} from "../bruin/bruinConnections";
import { BruinPanel } from "../panels/BruinPanel";

suite("Extension Initialization", () => {
  test("should set default path separator based on platform", async () => {
    // Determine the expected path separator based on the current platform
    const expectedPathSeparator = path.sep;

    // Update the path separator setting
    await vscode.workspace
      .getConfiguration("bruin")
      .update("pathSeparator", expectedPathSeparator, vscode.ConfigurationTarget.Global);

    // Retrieve the updated setting
    const pathSeparator = vscode.workspace.getConfiguration("bruin").get<string>("pathSeparator");

    // Assert that the path separator matches the expected value
    assert.strictEqual(pathSeparator, expectedPathSeparator);
  });
});
suite("getPathSeparator Tests", () => {
  test("should return the path separator from the user configuration", () => {
    const expectedPathSeparator = os.platform() === "win32" ? "\\" : "/"; // Adjust based on OS
    const pathSeparator = getPathSeparator();
    assert.strictEqual(pathSeparator, expectedPathSeparator);
  });
});

suite("replacePathSeparator Tests", () => {
  test("should replace path separators with the specified separator", () => {
    const input = "path/to/file";
    const expectedSeparator = os.platform() === "win32" ? "\\" : "/"; // Adjust based on OS
    const result = replacePathSeparator(input);
    assert.strictEqual(result, `path${expectedSeparator}to${expectedSeparator}file`);
  });

  test("should replace path separators with the default separator on Windows", () => {
    const input = "path\\to\\file";
    const platformStub = sinon.stub(process, "platform").value("win32"); // Override process.platform
    try {
      const result = replacePathSeparator(input);
      const expectedSeparator = getPathSeparator();
      assert.strictEqual(result, `path${expectedSeparator}to${expectedSeparator}file`);
    } finally {
      platformStub.restore(); // Restore original process.platform value
    }
  });
});

suite("findGitBashPath Tests", () => {
  let fsStub: sinon.SinonStub;
  let execSyncStub: sinon.SinonStub;
  let pathDirnameStub: sinon.SinonStub;
  let pathJoinStub: sinon.SinonStub;

  setup(() => {
    fsStub = sinon.stub(fs, "existsSync");
    execSyncStub = sinon.stub(require("child_process"), "execSync");
    pathDirnameStub = sinon.stub(path, "dirname");
    pathJoinStub = sinon.stub(path, "join");
  });

  teardown(() => {
    sinon.restore();
  });

  teardown(() => {
    sinon.restore();
  });

  test("Returns first existing Git path from commonGitPaths", () => {
    const expectedPath = "C:\\Program Files\\Git\\bin\\bash.exe";
    fsStub.withArgs(expectedPath).returns(true);
    fsStub.returns(false); // Default behavior for other paths

    const result = findGitBashPath();

    assert.strictEqual(result, expectedPath);
    assert.strictEqual(execSyncStub.called, false); // Should not try execSync if path found
  });

  test("Finds Git Bash path through execSync when common paths fail", () => {
    const originalPlatform = process.platform;
    sinon.stub(process, "platform").value("win32"); // Mock process.platform to return 'win32'

    fsStub.returns(false); // All common paths fail
    const gitExePath = "C:\\Program Files\\Git\\cmd\\git.exe";
    const expectedBashPath = "C:\\Program Files\\Git\\bin\\bash.exe";

    execSyncStub.returns(gitExePath);
    pathDirnameStub.returns("C:\\Program Files\\Git\\cmd");
    pathJoinStub.returns(expectedBashPath);
    fsStub.withArgs(expectedBashPath).returns(true);

    const result = findGitBashPath();

    assert.strictEqual(result, expectedBashPath);
  });

  test("Returns undefined when Git bash.exe does not exist anywhere", () => {
    fsStub.returns(false); // No paths exist
    execSyncStub.throws(new Error("Git not found"));

    const result = findGitBashPath();

    assert.strictEqual(result, undefined);
  });
});

suite("workspaceDirectory Tests", () => {
  let fsStatStub: sinon.SinonStub;
  let fsAccessStub: sinon.SinonStub;
  let pathDirnameStub: sinon.SinonStub;
  let consoleLogStub: sinon.SinonStub;
  let originalPathDirname: typeof path.dirname;

  setup(() => {
    fsStatStub = sinon.stub(fs.promises, "stat");
    fsAccessStub = sinon.stub(fs.promises, "access");
    consoleLogStub = sinon.stub(console, "log");

    // Store the original path.dirname before stubbing
    originalPathDirname = path.dirname;
    pathDirnameStub = sinon.stub(path, "dirname").callsFake(originalPathDirname);
  });

  teardown(() => {
    sinon.restore();
  });

  /* test("should handle errors and log them", async () => {
    const fsPath = "/path/to/project/file.txt";
    const error = new Error("unexpected error");

    // Configure stub to reject
    fsStatStub.rejects(error);

    const result = await bruinWorkspaceDirectory(fsPath);

    // Assertions
    assert.strictEqual(result, undefined, "Expected undefined due to error");

    // Use sinon assertion to check console.log was called
    sinon.assert.calledOnce(consoleLogStub);
    sinon.assert.calledWith(
      consoleLogStub,
      "failed to find the workspace directory",
      sinon.match.same(error)
    );
  }); */

  test("should handle nested file paths correctly", async () => {
    const fsPath = "/path/to/project/nested/file.txt";

    fsStatStub.resolves({ isFile: () => true }); // Simulate file check
    fsAccessStub.resolves(); // Simulate access success

    const result = await bruinWorkspaceDirectory(fsPath);

    // Validate the resulting path
    assert.ok(result?.includes("/path/to/project"), "Should find the workspace directory");
    sinon.assert.calledWith(pathDirnameStub, fsPath);
  });

  /* test("should return undefined for exceeding max iterations", async () => {
    const fsPath = "/path/to/project/file.txt";
    let callCount = 0;

    fsStatStub.resolves({ isFile: () => true });
    fsAccessStub.rejects(new Error("access denied")); // Simulate access failure

    const result = await bruinWorkspaceDirectory(fsPath);

    assert.strictEqual(result, undefined, "Should return undefined after max iterations");
  }); */
});
suite("BruinInstallCLI Tests", () => {
  let sandbox: sinon.SinonSandbox;
  let execAsyncStub: sinon.SinonStub;
  let execStub: sinon.SinonStub;
  let osPlatformStub: sinon.SinonStub;
  let getDefaultBruinExecutablePathStub: sinon.SinonStub;
  let createIntegratedTerminalStub: sinon.SinonStub;
  let compareVersionsStub: sinon.SinonStub;
  let workspaceFoldersStub: sinon.SinonStub;
  let terminalStub: Partial<vscode.Terminal>;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Setup stubs
    execAsyncStub = sandbox.stub();
    execStub = sandbox.stub();
    sandbox.stub(util, "promisify").returns(execAsyncStub);
    osPlatformStub = sandbox.stub(os, "platform");
    getDefaultBruinExecutablePathStub = sandbox
      .stub(configuration, "getDefaultBruinExecutablePath")
      .returns("/mock/bruin");
    compareVersionsStub = sandbox.stub(bruinUtils, "compareVersions");

    // Setup terminal stub
    terminalStub = {
      show: sandbox.stub(),
      sendText: sandbox.stub(),
      dispose: sandbox.stub(),
    };
    createIntegratedTerminalStub = sandbox
      .stub(bruinUtils, "createIntegratedTerminal")
      .resolves(terminalStub as vscode.Terminal);

    // Setup workspace stub
    workspaceFoldersStub = sandbox
      .stub(vscode.workspace, "workspaceFolders")
      .value([{ uri: { fsPath: "/mock/workspace" } }]);
  });

  teardown(() => {
    sandbox.restore();
  });

  suite("Constructor", () => {
    test("should initialize with correct platform", () => {
      osPlatformStub.returns("win32");
      const cli = new BruinInstallCLI();
      assert.equal((cli as any).platform, "win32");
    });
  });
  suite("checkBruinCliInstallation", () => {
    /*     test('should detect installed CLI on Windows with Git available', async () => {
      osPlatformStub.returns('win32');
      execAsyncStub.withArgs('/mock/bruin --version').resolves({ stdout: 'v0.11.106' }); 
      execAsyncStub.withArgs('git --version').resolves({ stdout: 'git version 2.0.0' });
    
      const cli = new BruinInstallCLI();
      const result = await cli.checkBruinCliInstallation();
      console.debug("result of the cli install command is ", result);
      // Check the expected result
      assert.deepEqual(result, {
        installed: true,
        isWindows: true,
        gitAvailable: true
      });
    }); */

    test("should detect non-installed CLI on non-Windows", async () => {
      osPlatformStub.returns("darwin");
      execAsyncStub.withArgs("/mock/bruin --version").rejects(new Error("not found"));

      const cli = new BruinInstallCLI();
      const result = await cli.checkBruinCliInstallation();

      assert.deepEqual(result, {
        installed: false,
        isWindows: false,
        gitAvailable: true,
      });
    });

    /*  test('should handle missing Git on Windows', async () => {
      osPlatformStub.returns('win32');
      execAsyncStub.withArgs('/mock/bruin --version').rejects(new Error('not found'));
      execAsyncStub.withArgs('git --version').rejects(new Error('git not found'));

      const cli = new BruinInstallCLI();
      const result = await cli.checkBruinCliInstallation();

      assert.deepEqual(result, {
        installed: false,
        isWindows: true,
        gitAvailable: false
      });
    }); */
  });
  suite("installBruinCli", () => {
    test("should execute correct install command on Windows", async () => {
      osPlatformStub.returns("win32");
      const cli = new BruinInstallCLI();
      await cli.installBruinCli();

      assert.strictEqual((terminalStub.show as sinon.SinonStub).callCount, 1);
      assert.strictEqual((terminalStub.show as sinon.SinonStub).firstCall.args[0], true);
      assert.strictEqual((terminalStub.sendText as sinon.SinonStub).callCount, 1);
      assert.strictEqual(
        (terminalStub.sendText as sinon.SinonStub).firstCall.args[0],
        "curl -LsSf https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh | sh"
      );
    });

    test("should execute correct install command on non-Windows", async () => {
      osPlatformStub.returns("darwin");
      const cli = new BruinInstallCLI();
      await cli.installBruinCli();

      assert.strictEqual((terminalStub.show as sinon.SinonStub).callCount, 1);
      assert.strictEqual((terminalStub.show as sinon.SinonStub).firstCall.args[0], true);
      assert.strictEqual((terminalStub.sendText as sinon.SinonStub).callCount, 1);
      assert.strictEqual(
        (terminalStub.sendText as sinon.SinonStub).firstCall.args[0],
        "curl -LsSL https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh | sh"
      );
    });
  });

  suite("updateBruinCli", () => {
    test("should execute update command correctly", async () => {
      osPlatformStub.returns("darwin");
      const cli = new BruinInstallCLI();
      await cli.updateBruinCli();

      assert.strictEqual((terminalStub.show as sinon.SinonStub).callCount, 1);
      assert.strictEqual((terminalStub.show as sinon.SinonStub).firstCall.args[0], true);
      assert.strictEqual((terminalStub.sendText as sinon.SinonStub).callCount, 1);
      assert.strictEqual(
        (terminalStub.sendText as sinon.SinonStub).firstCall.args[0],
        "curl -LsSL https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh | sh"
      );
    });
  });

  suite("installOrUpdate", () => {
    test("should call update when already installed", async () => {
      const cli = new BruinInstallCLI();
      const updateStub = sandbox.stub(cli, "updateBruinCli");
      const installStub = sandbox.stub(cli, "installBruinCli");

      await cli.installOrUpdate(true);

      assert.strictEqual(updateStub.callCount, 1);
      assert.strictEqual(installStub.callCount, 0);
    });

    test("should call install when not installed", async () => {
      const cli = new BruinInstallCLI();
      const updateStub = sandbox.stub(cli, "updateBruinCli");
      const installStub = sandbox.stub(cli, "installBruinCli");

      await cli.installOrUpdate(false);

      assert.strictEqual(installStub.callCount, 1);
      assert.strictEqual(updateStub.callCount, 0);
    });
  });
});

suite("patch asset testing", () => {
  let bruinInternalPatch: BruinInternalPatch;
  let runStub: sinon.SinonStub;
  let postMessageToPanelsStub: sinon.SinonStub;

  setup(() => {
    bruinInternalPatch = new BruinInternalPatch("bruin", "workingDirectory");
    runStub = sinon.stub(bruinInternalPatch as any, "run");
    postMessageToPanelsStub = sinon.stub(bruinInternalPatch as any, "postMessageToPanels");
  });

  teardown(() => {
    sinon.restore();
  });

  test("should call run with correct arguments and post success message", async () => {
    const body = { key: "value" };
    const filePath = "path/to/asset";
    const result = "success result";
    runStub.resolves(result);

    await bruinInternalPatch.patchAsset(body, filePath);

    sinon.assert.calledOnceWithExactly(runStub, [
      "patch-asset",
      "--body",
      JSON.stringify(body),
      filePath,
    ]);
    sinon.assert.calledOnceWithExactly(postMessageToPanelsStub, "success", result);
  });

  test("should call run with correct arguments and post error message on failure", async () => {
    const body = { key: "value" };
    const filePath = "path/to/asset";
    const error = new Error("error message");
    runStub.rejects(error);

    await bruinInternalPatch.patchAsset(body, filePath);

    sinon.assert.calledOnceWithExactly(runStub, [
      "patch-asset",
      "--body",
      JSON.stringify(body),
      filePath,
    ]);
    sinon.assert.calledOnceWithExactly(postMessageToPanelsStub, "error", error);
  });

  /* test('should handle unexpected errors and log them', async () => {
    const body = { key: 'value' };
    const filePath = 'path/to/asset';
    const unexpectedError = new Error('unexpected error');
    runStub.throws(unexpectedError);
    const consoleDebugStub = sinon.stub(console, 'debug');

    await bruinInternalPatch.patchAsset(body, filePath);

    sinon.assert.calledOnceWithExactly(runStub, ['patch-asset', '--body', JSON.stringify(body), filePath]);
    sinon.assert.calledOnce(consoleDebugStub);
    sinon.assert.calledWithExactly(consoleDebugStub, 'patching command error', unexpectedError);
  }); */
});

suite("Render Command Helper functions", () => {
  test("isFileExtensionSQL should return true for SQL files", () => {
    assert.strictEqual(isFileExtensionSQL("example.sql"), true);
    assert.strictEqual(isFileExtensionSQL("EXAMPLE.SQL"), true);
    assert.strictEqual(isFileExtensionSQL("example.txt"), false);
    assert.strictEqual(isFileExtensionSQL(""), false);
  });

  test("getFileExtension should return the file extension", () => {
    assert.strictEqual(getFileExtension("example.txt"), ".txt");
    assert.strictEqual(getFileExtension("example.sql"), ".sql");
    assert.strictEqual(getFileExtension("example"), "");
  });

  test("isPythonBruinAsset should return true for Python Bruin assets", async () => {
    const examplePythonAsset = `\"\"\" @bruin \nname: example\n type: python\n depends:\n - raw.example\n\"\"\"\nprint("Hello World")`;
    const examplePythonNoBruinAsset = `print("Hello World")`;
    const filePath = "bruinPythonAsset.py";
    const noBruinFilePath = "example.txt";
    fs.writeFileSync(filePath, examplePythonAsset);
    assert.strictEqual(await isPythonBruinAsset("bruinPythonAsset.py"), true);
    assert.strictEqual(await isPythonBruinAsset("example.txt"), false);
    fs.writeFileSync(noBruinFilePath, examplePythonNoBruinAsset);
    assert.strictEqual(await isPythonBruinAsset("example.txt"), false);
  });

  test("isBruinPipeline should return true for pipeline.yml files", async () => {
    assert.strictEqual(await isBruinPipeline("pipeline.yml"), true);
    assert.strictEqual(await isBruinPipeline("example.yml"), false);
  });

  test("isBruinYaml should return true for .bruin.yml files", async () => {
    assert.strictEqual(await isBruinYaml(".bruin.yml"), true);
    assert.strictEqual(await isBruinYaml("example.yml"), false);
  });

  test("encodeHTML should encode HTML special characters", () => {
    assert.strictEqual(
      encodeHTML("<script>alert('XSS');</script>"),
      "&lt;script&gt;alert(&#039;XSS&#039;);&lt;/script&gt;"
    );
  });

  test("removeAnsiColors should remove ANSI color codes", () => {
    assert.strictEqual(removeAnsiColors("\x1b[1;32mHello\x1b[0m World"), "Hello World");
  });

  test("processLineageData should extract the name property", () => {
    const lineageString = { name: "example-name" };
    assert.strictEqual(processLineageData(lineageString), "example-name");
  });
});

suite("Manage Bruin Connections Tests", function () {
  test("Should return an empty array for all null connections", async () => {
    const singleEnvconnections = {
      environments: {
        default: {
          connections: {
            aws: null,
            google_cloud_platform: null,
            snowflake: null,
          },
        },
      },
    };
    const connections = extractNonNullConnections(singleEnvconnections);
    assert.deepStrictEqual(connections, []);
  });

  test("Should return an array of connections for all non-null connections", async () => {
    const singleEnvconnections = {
      environments: {
        staging: {
          connections: {
            databricks: [
              {
                name: "databrick",
                token: "",
                path: "",
                host: "host",
                port: 1228,
              },
            ],
            generic: [
              {
                name: "test23",
                value: "val",
              },
            ],
          },
        },
      },
    };
    const connections = extractNonNullConnections(singleEnvconnections);
    assert.deepStrictEqual(connections, [
      {
        environment: "staging",
        type: "databricks",
        name: "databrick",
        token: "",
        path: "",
        host: "host",
        port: 1228,
      },
      { environment: "staging", type: "generic", name: "test23", value: "val" },
    ]);
  });

  test("Should return an array of connections from multiple environments", async () => {
    const multiEnvconnections = {
      environments: {
        default: {
          connections: {
            aws: null,
            google_cloud_platform: [
              {
                name: "gcp_project",
                project_id: "gcp_project_id",
              },
            ],
          },
        },
        staging: {
          connections: {
            aws: [
              {
                name: "aws_project",
                access_key_id: "aws_access_key",
              },
            ],
            snowflake: null,
          },
        },
      },
    };
    const connections = extractNonNullConnections(multiEnvconnections);
    assert.deepStrictEqual(connections, [
      {
        environment: "default",
        type: "google_cloud_platform",
        name: "gcp_project",
        project_id: "gcp_project_id",
      },
      {
        environment: "staging",
        type: "aws",
        name: "aws_project",
        access_key_id: "aws_access_key",
      },
    ]);
  });
});

suite("BruinCommand Tests", () => {
  let execFileStub: sinon.SinonStub;
  let bruinCommand: BruinCommand;

  // Create a concrete implementation of BruinCommand for testing
  class TestBruinCommand extends BruinCommand {
    protected bruinCommand(): string {
      return "test-command"; // Replace with the actual command you want to test
    }
  }

  setup(() => {
    execFileStub = sinon.stub(require("child_process"), "execFile");
    bruinCommand = new TestBruinCommand("path/to/bruin", "path/to/working/directory");
  });

  teardown(() => {
    sinon.restore();
  });

  test("execArgs should return correct arguments without additional flags", () => {
    const expectedArgs = ["test-command"];
    const result = (bruinCommand as any).execArgs([]);
    assert.deepStrictEqual(result, expectedArgs);
  });

  test("execArgs should return correct arguments with additional flags", () => {
    const flags = ["--flag1", "--flag2"];
    const expectedArgs = ["test-command", ...flags];
    const result = (bruinCommand as any).execArgs(flags);
    assert.deepStrictEqual(result, expectedArgs);
  });

  test("run should resolve with stdout on success", async () => {
    const query = ["--option"];
    const stdout = "Command executed successfully";
    execFileStub.yields(null, stdout, "");

    const result = await (bruinCommand as any).run(query);
    assert.strictEqual(result, stdout.trim());
  });

  test("run should reject with stderr on failure", async () => {
    const query = ["--option"];
    const stderr = "Error occurred";
    execFileStub.yields(new Error("Command failed"), "", stderr);

    try {
      await (bruinCommand as any).run(query);
      assert.fail("Expected promise to be rejected");
    } catch (error) {
      assert.strictEqual(error, stderr);
    }
  });

  test("run should resolve with empty string if ignoresErrors is true", async () => {
    const query = ["--option"];
    execFileStub.yields(new Error("Command failed"), "", "Some error");

    const result = await (bruinCommand as any).run(query, { ignoresErrors: true });
    assert.strictEqual(result, "");
  });

  test("run should handle empty query array", async () => {
    const query: string[] = [];
    const stdout = "No options provided";
    execFileStub.yields(null, stdout, "");

    const result = await (bruinCommand as any).run(query);
    assert.strictEqual(result, stdout.trim());
  });

  test("run should handle invalid command", async () => {
    const query = ["--invalid"];
    const stderr = "Command not found";
    execFileStub.yields(new Error("Command not found"), "", stderr);

    try {
      await (bruinCommand as any).run(query);
      assert.fail("Expected promise to be rejected");
    } catch (error) {
      assert.strictEqual(error, stderr);
    }
  });
});

suite("Bruin Connections Tests", () => {
  let bruinConnections: BruinConnections;
  let bruinDeleteConnection: BruinDeleteConnection;
  let bruinCreateConnection: BruinCreateConnection;
  let bruinGetAllBruinConnections: BruinGetAllBruinConnections;
  let execFileStub: sinon.SinonStub;
  let postMessageToPanelsStub: sinon.SinonStub;

  setup(() => {
    execFileStub = sinon.stub(require("child_process"), "execFile");
    postMessageToPanelsStub = sinon.stub(BruinPanel, "postMessage");

    bruinConnections = new BruinConnections("path/to/bruin", "path/to/working/directory");
    bruinDeleteConnection = new BruinDeleteConnection("path/to/bruin", "path/to/working/directory");
    bruinCreateConnection = new BruinCreateConnection("path/to/bruin", "path/to/working/directory");
    bruinGetAllBruinConnections = new BruinGetAllBruinConnections(
      "path/to/bruin",
      "path/to/working/directory"
    );
  });

  teardown(() => {
    sinon.restore();
  });

  // BruinConnections Tests
  test("BruinConnections getConnections should return connections on success", async () => {
    const connectionsResult = {
      default_environment_name: "default",
      selected_environment_name: "default",
      selected_environment: {
        connections: {
          adjust: [
            {
              name: "a",
              api_key: "ss",
            },
          ],
        },
      },
      environments: {
        default: {
          connections: {
            adjust: [
              {
                name: "a",
                api_key: "ss",
              },
            ],
          },
        },
      },
    };

    const stdout = JSON.stringify(connectionsResult);
    execFileStub.yields(null, stdout, "");

    await bruinConnections.getConnections();
    const expectedConnections = extractNonNullConnections(connectionsResult);
    sinon.assert.calledWith(postMessageToPanelsStub, "connections-list-message", {
      status: "success",
      message: expectedConnections,
    });
  });

  test("BruinConnections getConnections should return empty array when no connections", async () => {
    const connections: any = {}; // Return an empty array
    const stdout = JSON.stringify(connections);
    execFileStub.yields(null, stdout, "");

    await bruinConnections.getConnections();
    const expectedConnections = extractNonNullConnections(connections);

    sinon.assert.calledWith(postMessageToPanelsStub, "connections-list-message", {
      status: "success",
      message: expectedConnections,
    });
  });

  test("BruinConnections getConnections should handle error on failure", async () => {
    const stderr = "Error occurred";
    execFileStub.yields(new Error("Command failed"), "", stderr);

    await bruinConnections.getConnections();

    sinon.assert.calledWith(postMessageToPanelsStub, "connections-list-message", {
      status: "error",
      message: stderr,
    });
  });

  // BruinDeleteConnection Tests
  test("BruinDeleteConnection deleteConnection should post success message on success", async () => {
    const env = "staging";
    const connectionName = "test-connection";
    const flags = ["delete", "--env", env, "--name", connectionName];
    execFileStub.yields(null, "", "");
    await bruinDeleteConnection.deleteConnection(env, connectionName);
    sinon.assert.calledWith(postMessageToPanelsStub, "connections-list-after-delete", {
      status: "success",
      message: `Connection "${connectionName}" deleted successfully.`,
    });
  });

  test("BruinDeleteConnection deleteConnection should post error message on failure", async () => {
    const env = "staging";
    const connectionName = "test-connection";
    const stderr = "Error occurred";
    execFileStub.yields(new Error("Command failed"), "", stderr);

    await bruinDeleteConnection.deleteConnection(env, connectionName);
    sinon.assert.calledWith(postMessageToPanelsStub, "connections-list-after-delete", {
      status: "error",
      message: stderr,
    });
  });

  // BruinCreateConnection Tests
  test("BruinCreateConnection createConnection should post success message on success", async () => {
    const env = "staging";
    const connectionName = "test-connection";
    const connectionType = "chess";
    const credentials = { players: ["m", "d"] };
    execFileStub.yields(null, "", "");

    await bruinCreateConnection.createConnection(env, connectionName, connectionType, credentials);
    sinon.assert.calledWith(postMessageToPanelsStub, "connection-created-message", {
      status: "success",
      message: {
        name: connectionName,
        type: connectionType,
        environment: env,
        credentials: credentials,
      },
    });
  });

  test("BruinCreateConnection createConnection should post error message on failure", async () => {
    const env = "staging";
    const connectionName = "test-connection";
    const connectionType = "test-type";
    const credentials = { key: "value" };
    const stderr = "Error occurred";
    execFileStub.yields(new Error("Command failed"), "", stderr);

    await bruinCreateConnection.createConnection(env, connectionName, connectionType, credentials);
    sinon.assert.calledWith(postMessageToPanelsStub, "connection-created-message", {
      status: "error",
      message: stderr,
    });
  });

  // BruinGetAllBruinConnections Tests
  test("BruinGetAllBruinConnections getConnectionsListFromSchema should return connections on success", async () => {
    const connections = {
      "$schema":
        "https://github.com/bruin-data/bruin/blob/main/integration-tests/expected_connections_schema.json",
        "Connections": {
          "properties": {
            "aws": {
              "items": {
                "$ref": "#/$defs/AwsConnection"
              },
              "type": "array"
            },
            "google_cloud_platform": {
              "items": {
                "$ref": "#/$defs/GcpConnection"
              },
              "type": "array"
            },
          },
          "additionalProperties": false,
          "type": "object"
        },
    
    };
    const stdout = JSON.stringify(connections);
    execFileStub.yields(null, stdout, "");

    await bruinGetAllBruinConnections.getConnectionsListFromSchema();
    sinon.assert.calledWith(postMessageToPanelsStub, "connections-schema-message", {
      status: "success",
      message: connections,
    });
  });

  test("BruinGetAllBruinConnections getConnectionsListFromSchema should handle error on failure", async () => {
    const stderr = "Error occurred";
    execFileStub.yields(new Error("Command failed"), "", stderr);

    await bruinGetAllBruinConnections.getConnectionsListFromSchema();
    sinon.assert.calledWith(postMessageToPanelsStub, "connections-schema-message", {
      status: "error",
      message: stderr,
    });
  });
});
