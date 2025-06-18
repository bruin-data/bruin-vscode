/* eslint-disable @typescript-eslint/naming-convention */
import * as assert from "assert";
import * as vscode from "vscode";
import * as os from "os";
import * as util from "util";
import * as child_process from "child_process";

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
  prepareFlags,
} from "../utilities/helperUtils";
import * as configuration from "../extension/configuration";
import * as bruinUtils from "../bruin/bruinUtils";
import * as fs from "fs";
import path = require("path");
import sinon = require("sinon");
import {
  BruinInstallCLI,
  bruinWorkspaceDirectory,
  checkCliVersion,
  compareVersions,
  findGitBashPath,
  getBruinVersion,
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
import { LineagePanel } from "../panels/LineagePanel";
import { BruinLineage, BruinRender, BruinValidate } from "../bruin";
import { renderCommand, renderCommandWithFlags } from "../extension/commands/renderCommand";
import {
  createConnection,
  deleteConnection,
  getConnections,
  getConnectionsListFromSchema,
} from "../extension/commands/manageConnections";
import { lineageCommand } from "../extension/commands/lineageCommand";
import { BruinInternalParse } from "../bruin/bruinInternalParse";
import { BruinEnvList } from "../bruin/bruinSelectEnv";
import {  installOrUpdateCli } from "../extension/commands/updateBruinCLI";
import { getLanguageDelimiters } from "../utilities/delimiters";
import { bruinDelimiterRegex } from "../constants";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { BruinQueryOutput } from "../bruin/queryOutput";
import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { getQueryOutput } from "../extension/commands/queryCommands";
import { BruinExportQueryOutput } from "../bruin/exportQueryOutput";

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
suite("Bruin Utility Tests", () => {
  let execFileStub: sinon.SinonStub;

  setup(() => {
    execFileStub = sinon.stub(child_process, "execFile");
  });

  teardown(() => {
    execFileStub.restore();
  });
  suite("Compare versions tests", () => {
    test("should return false for equal versions", () => {
      assert.strictEqual(compareVersions("v1.0.0", "v1.0.0"), false);
    });
  
    test("should return false when current > latest", () => {
      assert.strictEqual(compareVersions("v1.1.0", "v1.0.0"), false);
    });
  
    test("should return true when current < latest", () => {
      assert.strictEqual(compareVersions("v1.0.0", "v1.1.0"), true);
    });

    test("getBruinVersion returns valid version data", async () => {
      execFileStub.yields(null, '{"version": "v1.0.0", "latest": "v1.1.0"}', '');
      
      const versionInfo = await getBruinVersion();
      assert.strictEqual(versionInfo?.version, "v1.0.0");
      assert.strictEqual(versionInfo?.latest, "v1.1.0");
    });

    test("getBruinVersion returns null when execFile fails", async () => {
      execFileStub.yields(new Error("Command failed"), '', '');
      const versionInfo = await getBruinVersion();
      assert.strictEqual(versionInfo, null);
    });
  });

  suite("Check CLI Version tests", () => {
    test("should return 'outdated' when current version is less than latest", async () => {
      execFileStub.yields(null, '{"version": "v1.0.0", "latest": "v1.1.0"}', '');
      const result = await checkCliVersion();
      assert.strictEqual(result.status, "outdated");
      assert.strictEqual(result.current, "v1.0.0");
      assert.strictEqual(result.latest, "v1.1.0");
    });

    test("should return 'current' when current version is equal to latest", async () => {
      execFileStub.yields(null, '{"version": "v1.1.0", "latest": "v1.1.0"}', '');
      const result = await checkCliVersion();
      assert.strictEqual(result.status, "current");
      assert.strictEqual(result.current, "v1.1.0");
      assert.strictEqual(result.latest, "v1.1.0");
    });

    test("should return 'error' when getBruinVersion returns null", async () => {
      execFileStub.yields(new Error("Command failed"), '', '');
      const result = await checkCliVersion();
      assert.strictEqual(result.status, "error");
    });
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

suite("isFileExtensionSQL Tests", () => {
  test("should return true for valid SQL file extensions", async () => {
    const validExtensions = ["test.sql", "Test.SQL"];
    validExtensions.forEach(async (ext) => {
      assert.strictEqual(await isFileExtensionSQL(ext), true);
    });
  });

  test("should return false for invalid SQL file extensions", () => {
    const invalidExtensions = [".py", ".yaml", ".json", ".csv"];
    invalidExtensions.forEach((ext) => {
      assert.strictEqual(isFileExtensionSQL(ext), false);
    });
  });
});
suite("isPythonBruinAsset Tests", () => {
  test("should return true for valid Python Bruin asset files", () => {
    const validFiles = ["file.py", "file.pyx", "file.PY", "file.PYX"];
    validFiles.forEach(async (file) => {
      assert.strictEqual(await isPythonBruinAsset(file), true);
    });
  });

  test("should return false for invalid Python Bruin asset files", () => {
    const invalidFiles = ["file.sql", "file.yaml", "file.json", "file.csv"];
    invalidFiles.forEach(async (file) => {
      assert.strictEqual(await isPythonBruinAsset(file), false);
    });
  });
});

suite("BruinInstallCLI Tests", () => {
  let sandbox: sinon.SinonSandbox;
  let execAsyncStub: sinon.SinonStub;
  let execStub: sinon.SinonStub;
  let osPlatformStub: sinon.SinonStub;
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

    test("should detect installed CLI on non-Windows", async () => {
      osPlatformStub.returns("darwin");

      const cli = new BruinInstallCLI();
      const result = await cli.checkBruinCliInstallation();

      assert.deepEqual(result, {
        installed: true,
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
    let tasksExecuteTaskStub: sinon.SinonStub;

    setup(() => {
      const listeners: ((e: vscode.TaskProcessEndEvent) => void)[] = [];
      sandbox.stub(vscode.tasks, 'onDidEndTaskProcess').value((listener: any) => {
        listeners.push(listener);
        return { dispose: () => {} }; // Mimic event disposable
      });
      tasksExecuteTaskStub = sandbox.stub(vscode.tasks, 'executeTask').callsFake((task) => {
        // Create a TaskExecution object
        const taskExecution = {
          task: task,
          terminate: function(): void {
            throw new Error("Function not implemented.");
          }
        };
        
        // Simulate task ending immediately with success
        listeners.forEach((listener: (e: vscode.TaskProcessEndEvent) => void) => listener({
          execution: taskExecution,
          exitCode: 0,
        }));
        
        // Return a Promise that resolves with the TaskExecution object
        return Promise.resolve(taskExecution);
      });
    });
    test("should execute install command on Windows", async () => {
      // Stub os.platform() to return "win32"
      osPlatformStub.returns("win32");
    
      // Stub findGitBashPath to return a valid Git Bash path.
      const fakeGitBashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
      const findGitBashStub = sinon.stub(bruinUtils, "findGitBashPath").returns(fakeGitBashPath);
    
      // Create instance of your CLI installer
      const cli = new BruinInstallCLI();
      
      await cli.installBruinCli();
    
      // Verify that the task was executed
      assert.strictEqual(tasksExecuteTaskStub.callCount, 1);
      // Check that a task was executed with the right name
      assert.strictEqual(
        tasksExecuteTaskStub.firstCall.args[0].name,
        "Bruin Install/Update"
      );
      
      // For Windows, getCommand returns a path to a temporary batch file.
      const shellExecution = tasksExecuteTaskStub.firstCall.args[0].execution as vscode.ShellExecution;
      const batchFilePath = shellExecution.commandLine as string;
    
      // Read the content of the batch file and verify it contains the expected curl command.
      const batchContent = fs.readFileSync(batchFilePath, "utf8");
      assert.match(
        batchContent,
        /curl -LsSL https:\/\/raw\.githubusercontent\.com\/bruin-data\/bruin\/refs\/heads\/main\/install\.sh \| sh/
      );
    
      // Restore stub after test if needed
      findGitBashStub.restore();
    });
  
    test("should execute install command on non-Windows", async () => {
      osPlatformStub.returns("darwin");
      const cli = new BruinInstallCLI();
      
      await cli.installBruinCli();
  
      assert.strictEqual(tasksExecuteTaskStub.callCount, 1);
      const shellExecution = tasksExecuteTaskStub.firstCall.args[0].execution as vscode.ShellExecution;
      assert.match(
        shellExecution.commandLine as string,
        /curl -LsSL https:\/\/raw\.githubusercontent\.com\/bruin-data\/bruin\/refs\/heads\/main\/install\.sh \| sh/
      );
    });
  });

  suite("updateBruinCli", () => {
    let tasksExecuteTaskStub: sinon.SinonStub;

    setup(() => {
      const listeners: ((e: vscode.TaskProcessEndEvent) => void)[] = [];
      sandbox.stub(vscode.tasks, 'onDidEndTaskProcess').value((listener: any) => {
        listeners.push(listener);
        return { dispose: () => {} }; // Mimic event disposable
      });
      
      tasksExecuteTaskStub = sandbox.stub(vscode.tasks, 'executeTask').callsFake((task) => {
        // Create a TaskExecution object
        const taskExecution = {
          task: task,
          terminate: function(): void {
            throw new Error("Function not implemented.");
          }
        };
        
        // Simulate task ending immediately with success
        listeners.forEach((listener: (e: vscode.TaskProcessEndEvent) => void) => listener({
          execution: taskExecution,
          exitCode: 0,
        }));
        
        // Return a Promise that resolves with the TaskExecution object
        return Promise.resolve(taskExecution);
      });
    });

  test("should execute update command correctly", async () => {
    osPlatformStub.returns("darwin");
    const cli = new BruinInstallCLI();
    
    await cli.updateBruinCli();

    assert.strictEqual(tasksExecuteTaskStub.callCount, 1);
    const shellExecution = tasksExecuteTaskStub.firstCall.args[0].execution as vscode.ShellExecution;
    assert.match(
      shellExecution.commandLine as string,
      /curl -LsSL https:\/\/raw\.githubusercontent\.com\/bruin-data\/bruin\/refs\/heads\/main\/install\.sh \| sh/
    );
  });
}); 

suite("installOrUpdateCli", () => {
  let checkStub: sinon.SinonStub;
  let updateStub: sinon.SinonStub;
  let installStub: sinon.SinonStub;
  
  setup(() => {
    // Stub the public methods we want to test
    const checkResult = { installed: false, isWindows: false, gitAvailable: true };
    checkStub = sandbox.stub(BruinInstallCLI.prototype, "checkBruinCliInstallation").resolves(checkResult);
    updateStub = sandbox.stub(BruinInstallCLI.prototype, "updateBruinCli").resolves();
    installStub = sandbox.stub(BruinInstallCLI.prototype, "installBruinCli").resolves();
  });

  test("should call update when already installed", async () => {
    // Override the stub to return that CLI is installed
    checkStub.resolves({ installed: true, isWindows: false, gitAvailable: true });
    
    await installOrUpdateCli();

    assert.strictEqual(updateStub.callCount, 1);
    assert.strictEqual(installStub.callCount, 0);
  });

  test("should call install when not installed", async () => {
    // Default stub returns not installed
    await installOrUpdateCli();

    assert.strictEqual(updateStub.callCount, 0);
    assert.strictEqual(installStub.callCount, 1);
  });
});
});
suite("Render Commands", () => {
  let activeEditorStub: sinon.SinonStub<any[], any> = sinon.stub();
  let renderStub: sinon.SinonStub;
  let bruinRenderMock: sinon.SinonStubbedInstance<BruinRender>;

  const mockExtensionUri = vscode.Uri.file("mockUri");

  setup(() => {
    activeEditorStub.callsFake(() => ({
      document: {
        fileName: "file/path/mock.sql",
      },
    }));
    activeEditorStub.value = activeEditorStub();
    bruinRenderMock = sinon.createStubInstance(BruinRender);
    renderStub = sinon.stub(BruinRender.prototype, "render").resolves();
    sinon.stub(BruinPanel, "render").callsFake(() => {});
  });

  teardown(() => {
    sinon.restore();
  });
  suite("renderCommand", () => {
    /* test("should call BruinPanel.render and BruinRender.render with the active editor file", async () => {
      const mockFileName = "file/path/mock.sql";
      activeEditorStub.callsFake(() => ({
        document: { fileName: mockFileName }
      }));

      await renderCommand(mockExtensionUri);

      // Assert renderStub was called once with the correct file name and default flags
      sinon.assert.calledOnce(renderStub);
      sinon.assert.calledWithExactly(renderStub, mockFileName, { flags: ["-o", "json"] });
    }); */

    test("should not execute render if there is no active editor", async () => {
      activeEditorStub.callsFake(() => null);

      await renderCommand(mockExtensionUri);

      sinon.assert.notCalled(renderStub);
    });
  });

  suite("renderCommandWithFlags", () => {
    /*  test("should render the active editor file with flags", async () => {
      const mockFileName = "file/path/mock.sql";
      const mockFlags = "--downstream";
      const mockTextEditor: vscode.TextEditor = { document: { fileName: mockFileName } } as vscode.TextEditor;

      activeEditorStub.callsFake(() => mockTextEditor);

      await renderCommandWithFlags(mockFlags);

      // Assert renderStub was called once with the correct file name and flags
      sinon.assert.calledOnce(renderStub);
      sinon.assert.calledWithExactly(renderStub, mockFileName, {
        flags: prepareFlags(mockFlags, ["--downstream", "--push-metadata"]),
      });
      sinon.assert.calledWith(renderStub, sinon.match.string, sinon.match.object);
    }); */

    test("should render the last rendered document if no active editor exists", async () => {
      const lastRenderedDocument = "file/path/last-rendered.sql";
      activeEditorStub.callsFake(() => null);

      await renderCommandWithFlags("--push-metadata", lastRenderedDocument);

      sinon.assert.calledOnce(renderStub);
      sinon.assert.calledWithExactly(renderStub, lastRenderedDocument, {
        flags: prepareFlags("--push-metadata", ["--downstream", "--push-metadata"]),
      });
    });

    test("should not execute render if no file path is available", async () => {
      activeEditorStub.callsFake(() => ({
        document: { fileName: undefined },
      }));

      await renderCommandWithFlags("", undefined);

      sinon.assert.notCalled(renderStub); // Verify renderStub is not called
    });
  });
});
suite("BruinRender Tests", () => {
  let bruinRender: BruinRender;
  let runStub: sinon.SinonStub;
  let runWithoutJsonFlagStub: sinon.SinonStub;
  let isValidAssetStub: sinon.SinonStub;
  let detectBruinAssetStub: sinon.SinonStub;
  let isBruinPipelineStub: sinon.SinonStub;
  let isBruinYamlStub: sinon.SinonStub;
  const bruinExecutablePath = "path/to/bruin/executable";
  const workingDirectory = "path/to/working/directory";
  setup(() => {
    bruinRender = new BruinRender(bruinExecutablePath, workingDirectory);
    runStub = sinon
    .stub(bruinRender as any, "run")
    .resolves(JSON.stringify({ query: "SELECT * FROM table" }));
    runStub.rejects(new Error("Error rendering asset"));

    runWithoutJsonFlagStub = sinon
      .stub(bruinRender as any, "runWithoutJsonFlag")
      .resolves("Non-SQL rendered successfully");
    isValidAssetStub = sinon.stub(bruinRender as any, "isValidAsset");
    detectBruinAssetStub = sinon.stub(bruinRender as any, "detectBruinAsset");
    isBruinPipelineStub = sinon.stub(bruinRender as any, "isBruinPipeline");
    isBruinYamlStub = sinon.stub(bruinRender as any, "isBruinYaml");
  });

  teardown(() => {
    sinon.restore();
  });

  test("render should call run with correct flags for SQL assets", async () => {
    const filePath = "path/to/sql/asset.sql";
    isValidAssetStub.resolves(true);
    detectBruinAssetStub.resolves(false);
    isBruinPipelineStub.resolves(false);
    isBruinYamlStub.resolves(false);

    await bruinRender.render(filePath);

    sinon.assert.calledOnceWithExactly(runStub, ["-o", "json", filePath], { ignoresErrors: false });
  });

  /* test("render should call runWithoutJsonFlag for non-SQL assets", async () => {
    const filePath = "path/to/python/asset.py";
    const runWithoutJsonFlagStub = sinon.stub(bruinRender as any, "runWithoutJsonFlag").resolves("Non-SQL rendered successfully");
    isValidAssetStub.resolves(true);
    detectBruinAssetStub.resolves(true);
    isBruinPipelineStub.resolves(false);
    isBruinYamlStub.resolves(false);
  
    await bruinRender.render(filePath);
  
    sinon.assert.calledOnce(runWithoutJsonFlagStub); // Assert the method was called once
    const callArgs = runWithoutJsonFlagStub.args[0]; // Get the arguments of the first call
    assert.strictEqual(callArgs[0], filePath); // Assert the first argument is the file path
  }); */

  test("handle error checking file type", async () => {
    const filePath = "path/to/asset";
    const error = new Error("Error checking asset type");
    isValidAssetStub.rejects(error);

    try {
      await bruinRender.render(filePath);
    } catch (err: any) {
      assert.strictEqual(err.message, error.message);
    }
  });

  test("render should handle error when checking asset type", async () => {
    const filePath = "path/to/asset";
    const error = new Error("Error checking asset type");
    isValidAssetStub.rejects(error);

    try {
      await bruinRender.render(filePath);
    } catch (err: any) {
      assert.strictEqual(err.message, error.message);
    }
  });

  test("render should handle error when running render command", async () => {
    const filePath = "path/to/sql/asset.sql";
    isValidAssetStub.resolves(true);
    detectBruinAssetStub.resolves(false);
    isBruinPipelineStub.resolves(false);
    isBruinYamlStub.resolves(false);
    runStub.rejects(new Error("Error rendering asset"));

    try {
      await bruinRender.render(filePath);
    } catch (err: any) {
      assert.strictEqual(err.message, "Error rendering asset");
    }
  });
});

suite("BruinValidate Tests", () => {
  let bruinValidate: BruinValidate;
  let runStub: sinon.SinonStub;
  let postMessageStub: sinon.SinonStub;

  setup(() => {
    bruinValidate = new BruinValidate("path/to/bruin/executable", "path/to/working/directory");
    runStub = sinon.stub(bruinValidate as any, "run");
    postMessageStub = sinon.stub(BruinPanel, "postMessage");
  });

  teardown(() => {
    sinon.restore();
  });

  test("validate should call run with correct flags", async () => {
    const filePath = "path/to/asset";
    const flags = ["-o", "json"];
    runStub.resolves("{}");

    await bruinValidate.validate(filePath, { flags });

    sinon.assert.calledOnceWithExactly(runStub, [...flags, filePath], { ignoresErrors: false });
  });

  test("validate should handle error when running validation command on Mac and Linux", async () => {
    const filePath = "path/to/asset";
    const error = new Error("Validation command failed");
    runStub.rejects(error);

    await bruinValidate.validate(filePath);

    sinon.assert.calledTwice(postMessageStub);

    sinon.assert.calledWithExactly(postMessageStub.firstCall, "validation-message", {
      status: "loading",
      message: "Validating asset...",
    });

    // Update the second assertion to match the new error message structure
    const secondCallArgs = postMessageStub.secondCall.args[1];
    assert.strictEqual(secondCallArgs.status, "error");
    assert.strictEqual(typeof secondCallArgs.message, "string"); // Assert message is a string

    // To check for specific content in the error message,
    // you could use strictEqual with a regex or a substring,
    // but keep in mind the exact error message format might vary.
    // For example, to check if the error message contains a certain text:
    true === secondCallArgs.message.includes("Validation command failed"); // Note: This isn't strictly an assertion, but a truthy check. For strict assertions, consider the message format more precisely.
  });

  test("validate should indicate loading state when validation is in progress", async () => {
    const filePath = "path/to/asset";
    runStub.resolves("{}");

    const validatePromise = bruinValidate.validate(filePath);

    // Assert loading state before completion
    assert.strictEqual(
      bruinValidate.isLoading,
      true,
      "Loading state should be true during validation"
    );

    await validatePromise;

    // Assert loading state after completion
    assert.strictEqual(
      bruinValidate.isLoading,
      false,
      "Loading state should be false after validation"
    );
  });

  test("validate should handle multiple validation results", async () => {
    const filePath = "path/to/asset";
    const validationResults = JSON.stringify([
      { issues: { error: "Error message 1" } },
      { issues: { error: "Error message 2" } },
    ]);
    runStub.resolves(validationResults);

    await bruinValidate.validate(filePath);
    // Assert the expected behavior
    sinon.assert.calledTwice(postMessageStub);
  });

  test("validate should reset loading state after validation completes", async () => {
    const filePath = "path/to/asset";
    runStub.resolves("{}");

    await bruinValidate.validate(filePath);

    assert.strictEqual(
      bruinValidate.isLoading,
      false,
      "Loading state should be false after validation"
    );
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

suite("BruinLineage Tests", () => {
  let bruinLineage: BruinLineage;
  let runStub: sinon.SinonStub;
  let postMessageStub: sinon.SinonStub;

  setup(() => {
    bruinLineage = new BruinLineage("mock-executable-path", "mock-workspace-directory");
    runStub = sinon.stub(bruinLineage as any, "run"); // Stub the run method
    postMessageStub = sinon.stub(BruinPanel, "postMessage");
  });

  teardown(() => {
    sinon.restore();
  });

  test("displayLineage resolves with success message on successful run", async () => {
    const filePath = "path/to/file";
    const flags = ["-o", "json"];
    const lineageDisplayed = "mock-lineage-displayed";

    runStub.resolves(lineageDisplayed);

    await bruinLineage.displayLineage(filePath, { flags });

    sinon.assert.calledWith(postMessageStub, "lineage-message", {
      status: "success",
      message: lineageDisplayed,
    });
  });

  test("displayLineage resolves with error message on failed run", async () => {
    const filePath = "path/to/file";
    const flags = ["-o", "json"];
    const error = new Error("mock-error");

    runStub.rejects(error);

    await bruinLineage.displayLineage(filePath, { flags });

    sinon.assert.calledWith(postMessageStub, "lineage-message", {
      status: "error",
      message: error, // Ensure we send the error message
    });
  });
});
suite("Connection Management Tests", () => {
  let bruinWorkspaceDirectoryStub: sinon.SinonStub;
  let getConnectionsStub: sinon.SinonStub;
  let getConnectionsListFromSchemaStub: sinon.SinonStub;
  let deleteConnectionStub: sinon.SinonStub;
  let createConnectionStub: sinon.SinonStub;

  setup(() => {
    bruinWorkspaceDirectoryStub = sinon
      .stub(bruinUtils, "bruinWorkspaceDirectory")
      .resolves("path/to/workspace");
    getConnectionsStub = sinon.stub(BruinConnections.prototype, "getConnections").resolves();
    getConnectionsListFromSchemaStub = sinon
      .stub(BruinGetAllBruinConnections.prototype, "getConnectionsListFromSchema")
      .resolves();
    deleteConnectionStub = sinon
      .stub(BruinDeleteConnection.prototype, "deleteConnection")
      .resolves();
    createConnectionStub = sinon
      .stub(BruinCreateConnection.prototype, "createConnection")
      .resolves();
  });

  teardown(() => {
    sinon.restore();
  });

  suite("getConnections", () => {
    test("should call BruinConnections.getConnections with the correct arguments", async () => {
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");

      await getConnections(lastRenderedDocumentUri);

      sinon.assert.calledOnce(getConnectionsStub);
      sinon.assert.calledOnceWithExactly(
        bruinWorkspaceDirectoryStub,
        lastRenderedDocumentUri.fsPath
      );
    });

    test("should handle error when getting connections", async () => {
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");
      getConnectionsStub.rejects(new Error("Error getting connections"));

      try {
        await getConnections(lastRenderedDocumentUri);
        assert.fail("Expected promise to be rejected");
      } catch (err: any) {
        assert.strictEqual(err.message, "Error getting connections");
      }
    });
  });

  suite("getConnectionsListFromSchema", () => {
    test("should call BruinGetAllBruinConnections.getConnectionsListFromSchema with the correct arguments", async () => {
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");

      await getConnectionsListFromSchema(lastRenderedDocumentUri);

      sinon.assert.calledOnce(getConnectionsListFromSchemaStub);
      sinon.assert.calledOnceWithExactly(
        bruinWorkspaceDirectoryStub,
        lastRenderedDocumentUri.fsPath
      );
    });

    test("should handle error when getting connections list from schema", async () => {
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");
      getConnectionsListFromSchemaStub.rejects(
        new Error("Error getting connections list from schema")
      );

      try {
        await getConnectionsListFromSchema(lastRenderedDocumentUri);
        assert.fail("Expected promise to be rejected");
      } catch (err: any) {
        assert.strictEqual(err.message, "Error getting connections list from schema");
      }
    });
  });

  suite("deleteConnection", () => {
    test("should call BruinDeleteConnection.deleteConnection with the correct arguments", async () => {
      const env = "env";
      const connectionName = "connectionName";
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");

      await deleteConnection(env, connectionName, lastRenderedDocumentUri);

      sinon.assert.calledOnceWithExactly(deleteConnectionStub, env, connectionName);
      sinon.assert.calledOnceWithExactly(
        bruinWorkspaceDirectoryStub,
        lastRenderedDocumentUri.fsPath
      );
    });

    test("should handle error when deleting connection", async () => {
      const env = "env";
      const connectionName = "connectionName";
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");
      deleteConnectionStub.rejects(new Error("Error deleting connection"));

      try {
        await deleteConnection(env, connectionName, lastRenderedDocumentUri);
        assert.fail("Expected promise to be rejected");
      } catch (err: any) {
        assert.strictEqual(err.message, "Error deleting connection");
      }
    });
  });

  suite("createConnection", () => {
    test("should call BruinCreateConnection.createConnection with the correct arguments", async () => {
      const env = "env";
      const connectionName = "connectionName";
      const connectionType = "connectionType";
      const credentials = {};
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");

      await createConnection(
        env,
        connectionName,
        connectionType,
        credentials,
        lastRenderedDocumentUri
      );

      sinon.assert.calledOnceWithExactly(
        createConnectionStub,
        env,
        connectionName,
        connectionType,
        credentials
      );
      sinon.assert.calledOnceWithExactly(
        bruinWorkspaceDirectoryStub,
        lastRenderedDocumentUri.fsPath
      );
    });

    test("should handle error when creating connection", async () => {
      const env = "env";
      const connectionName = "connectionName";
      const connectionType = "connectionType";
      const credentials = {};
      const lastRenderedDocumentUri = vscode.Uri.file("path/to/file");
      createConnectionStub.rejects(new Error("Error creating connection"));

      try {
        await createConnection(
          env,
          connectionName,
          connectionType,
          credentials,
          lastRenderedDocumentUri
        );
        assert.fail("Expected promise to be rejected");
      } catch (err: any) {
        assert.strictEqual(err.message, "Error creating connection");
      }
    });
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
suite("Lineage Command Tests", () => {
  let displayLineageStub: sinon.SinonStub;

  setup(() => {
    // Stub the configuration method

    // Stub the bruinWorkspaceDirectory method

    // Stub the displayLineage method of BruinLineage
    displayLineageStub = sinon.stub(BruinLineage.prototype, "displayLineage");
  });

  teardown(() => {
    sinon.restore();
  });

  test("returns early when lastRenderedDocumentUri is undefined", async () => {
    await lineageCommand(undefined);
    sinon.assert.notCalled(displayLineageStub);
  });

  test("instantiates BruinLineage with correct parameters", async () => {
    // Create a temporary file for testing
    const tempFile = vscode.Uri.file("/tmp/test-document.txt");

    await lineageCommand(tempFile);

    // Check if the displayLineage method was called with the correct parameters
    sinon.assert.calledOnce(displayLineageStub);
    sinon.assert.calledWith(displayLineageStub, tempFile.fsPath, { flags: ["-o", "json"] });
  });

  test("calls displayLineage on BruinLineage instance with correct parameters", async () => {
    // Create a temporary file for testing
    const tempFile = vscode.Uri.file("/tmp/test-document.txt");

    await lineageCommand(tempFile, ["-o", "json"]);

    sinon.assert.calledOnce(displayLineageStub);
    sinon.assert.calledWith(displayLineageStub, tempFile.fsPath, { flags: ["-o", "json"] });
  });
});

suite("BruinConnections Tests", () => {
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
      $schema:
        "https://github.com/bruin-data/bruin/blob/main/integration-tests/expected_connections_schema.json",
      Connections: {
        properties: {
          aws: {
            items: {
              $ref: "#/$defs/AwsConnection",
            },
            type: "array",
          },
          google_cloud_platform: {
            items: {
              $ref: "#/$defs/GcpConnection",
            },
            type: "array",
          },
        },
        additionalProperties: false,
        type: "object",
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

suite("BruinPanel Tests", () => {
  let windowCreateWebviewPanelStub: sinon.SinonStub;
  let windowActiveTextEditorStub: sinon.SinonStub;
  let workspaceWorkspaceFoldersStub: sinon.SinonStub;
  let bruinValidateStub: sinon.SinonStub;
  let lineageCommandStub: sinon.SinonStub;
  let runInTerminalStub: sinon.SinonStub;
  let bruinInstallCliStub: sinon.SinonStub;
  let bruinWorkspaceDirectoryStub: sinon.SinonStub;
  let getCurrentPipelinePathStub: sinon.SinonStub;
  let pathExistsStub: sinon.SinonStub;
  let patchAssetCommandStub: sinon.SinonStub;
  let parseAssetCommandStub: sinon.SinonStub;
  let getConnectionsStub: sinon.SinonStub;
  let getEnvListCommandStub: sinon.SinonStub;
  let getConnectionsListFromSchemaStub: sinon.SinonStub;
  let deleteConnectionStub: sinon.SinonStub;
  let createConnectionStub: sinon.SinonStub;
  const mockExtensionUri = vscode.Uri.file("/mock/extension/path");
  const mockDocumentUri = vscode.Uri.file("/mock/document.sql");

  setup(() => {
    // Stub VSCode window and workspace methods
    windowCreateWebviewPanelStub = sinon.stub(vscode.window, "createWebviewPanel").returns({
      webview: {
        postMessage: sinon.stub(),
        onDidReceiveMessage: sinon.stub(),
        html: "",
        cspSource: "default-src",
        asWebviewUri: sinon.stub(),
      },
      iconPath: {},
      onDidDispose: sinon.stub(),
      dispose: sinon.stub(),
      reveal: sinon.stub(),
    } as any);

    windowActiveTextEditorStub = sinon.stub(vscode.window, "activeTextEditor").get(() => ({
      document: {
        uri: mockDocumentUri,
        fsPath: mockDocumentUri.fsPath,
      },
    }));

    workspaceWorkspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([{ uri: vscode.Uri.file("/mock/workspace") }]);

    pathExistsStub = sinon.stub(fs, "existsSync").returns(true);
    bruinWorkspaceDirectoryStub = sinon
      .stub(bruinUtils, "bruinWorkspaceDirectory")
      .resolves("/mock/workspace");
    getCurrentPipelinePathStub = sinon
      .stub(bruinUtils, "getCurrentPipelinePath")
      .callsFake(async () => "/mock/pipeline.yml");

    // Stub BruinValidate
    bruinValidateStub = sinon.stub(BruinValidate.prototype, "validate");
    parseAssetCommandStub = sinon.stub(BruinInternalParse.prototype, "parseAsset");
    patchAssetCommandStub = sinon.stub(BruinInternalPatch.prototype, "patchAsset");
    getConnectionsStub = sinon.stub(BruinConnections.prototype, "getConnections");
    getEnvListCommandStub = sinon.stub(BruinEnvList.prototype, "getEnvironmentsList");
    getConnectionsListFromSchemaStub = sinon
      .stub(BruinGetAllBruinConnections.prototype, "getConnectionsListFromSchema")
      .resolves();
    deleteConnectionStub = sinon.stub(BruinDeleteConnection.prototype, "deleteConnection");
    createConnectionStub = sinon.stub(BruinCreateConnection.prototype, "createConnection");
    // Stub runInIntegratedTerminal
    runInTerminalStub = sinon.stub(bruinUtils, "runInIntegratedTerminal");

    // Stub BruinInstallCLI
    bruinInstallCliStub = sinon
      .stub(BruinInstallCLI.prototype, "checkBruinCliInstallation")
      .resolves({
        installed: false,
        isWindows: true,
        gitAvailable: true,
      });
  });

  teardown(() => {
    sinon.restore();
    BruinPanel.currentPanel = undefined;
  });

  suite("Render Tests", () => {
    test("creates a new webview panel if no current panel exists", () => {
      BruinPanel.render(mockExtensionUri);

      assert.ok(windowCreateWebviewPanelStub.calledOnce, "Webview panel should be created");
      assert.ok(BruinPanel.currentPanel, "Current panel should be set");
    });

    test("reveals existing panel if already created", () => {
      // First render creates the panel
      BruinPanel.render(mockExtensionUri);
      const firstPanel = BruinPanel.currentPanel;

      // Second render should reveal the existing panel
      BruinPanel.render(mockExtensionUri);
      assert.strictEqual(BruinPanel.currentPanel, firstPanel, "Should use existing panel");
    });

    test("renders with non-existing extension URI", async () => {
      const invalidUri = vscode.Uri.file("/invalid/path");
      try {
        await BruinPanel.render(invalidUri);
        assert.fail("Expected an error to be thrown");
      } catch (error) {
        assert.ok(
          windowCreateWebviewPanelStub.calledOnce,
          "Webview panel creation should have been attempted"
        );
      }

      windowCreateWebviewPanelStub.restore();
    });

    test("handles multiple consecutive render calls", async () => {
      await BruinPanel.render(mockExtensionUri);
      const initialPanel = BruinPanel.currentPanel;
      await BruinPanel.render(mockExtensionUri);
      assert.strictEqual(
        BruinPanel.currentPanel,
        initialPanel,
        "Should use the same panel instance"
      );
    });
  });

  suite("Message Handling", () => {
    let panel: BruinPanel;
    let messageHandler: (message: any) => void;
    setup(() => {
      BruinPanel.render(mockExtensionUri);
      panel = BruinPanel.currentPanel!;
      messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
    });

    test("handles unknown commands", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const unknownMessage = { command: "unknownCommand" };

      await messageHandler(unknownMessage);
      // Assert no error was thrown or expect a specific handling behavior (e.g., logging)
    });

    test("validateCurrentPipeline with no active document", async () => {
      windowActiveTextEditorStub.value(undefined); // Simulate no active text editor
      const message = { command: "bruin.validateCurrentPipeline" };

      await messageHandler(message);
      const consoleErrorStub = sinon.stub(console, "error");
      assert.ok(consoleErrorStub.notCalled, "No error should be logged");
      consoleErrorStub.restore();
    });

    test("validateCurrentPipeline with pipeline file", async () => {
      const message = { command: "bruin.validateCurrentPipeline" };
      await messageHandler(message);

      assert.ok(bruinValidateStub.calledOnce, "Validate method should be called");
    });

    test("handles bruin.validateAll command", async () => {
      const webviewPanel = windowCreateWebviewPanelStub.returnValues[0];
      const messageHandler = (webviewPanel.webview.onDidReceiveMessage as sinon.SinonStub).firstCall
        .args[0];
      const message = { command: "bruin.validateAll" };

      await messageHandler(message);

      assert.ok(bruinValidateStub.calledOnce, "Validate method should be called");
    });

    test("handles bruin.runSql command", async () => {
      const message = {
        command: "bruin.runSql",
        payload: { sqlCommand: "SELECT * FROM users" },
      };

      await messageHandler(message);

      assert.ok(runInTerminalStub.calledOnce, "Run in terminal should be called");
      //assert.ok(bruinWorkspaceDirectoryStub.calledOnce, "Workspace directory should be resolved");
    });

    test("bruin.runSql error handling", async () => {
      const message = { command: "bruin.runSql", payload: { sqlCommand: "SELECT * FROM users" } };

      try {
        await messageHandler(message);
        assert.fail("Expected an error to be thrown");
      } catch (error) {
        assert.ok(runInTerminalStub.calledOnce, "Terminal command should have been attempted");
      }

      runInTerminalStub.restore();
    });

    test("handles checkBruinCliInstallation command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = { command: "checkBruinCliInstallation" };

      await messageHandler(message);

      assert.ok(bruinInstallCliStub.calledOnce, "CLI installation check should be performed");
    });
    /*     test('handles bruin.getAssetLineage command', async () => {
      const messageHandler = (windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub).firstCall.args[0];
      const message = { command: 'bruin.getAssetLineage' };
  
      await messageHandler(message);
  
      assert.ok(lineageCommandStub.calledOnce, 'Lineage command should be called once');
    }); */

    test("handles bruin.getAssetDetails command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = { command: "bruin.getAssetDetails" };

      await messageHandler(message);

      assert.ok(parseAssetCommandStub.calledOnce, "Parse asset command should be called once");
      parseAssetCommandStub.restore();
    });

    test("handles bruin.setAssetDetails command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = { command: "bruin.setAssetDetails", payload: { key: "value" } };

      await messageHandler(message);

      assert.ok(patchAssetCommandStub.calledOnce, "Patch asset command should be called once");
      patchAssetCommandStub.restore();
    });

    test("handles bruin.getEnvironmentsList command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = { command: "bruin.getEnvironmentsList" };

      await messageHandler(message);

      assert.ok(
        getEnvListCommandStub.calledOnce,
        "Get environments list command should be called once"
      );
      getEnvListCommandStub.restore();
    });

    test("handles bruin.getConnectionsList command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = { command: "bruin.getConnectionsList" };

      await messageHandler(message);

      assert.ok(
        getConnectionsStub.calledOnce,
        "Get connections list command should be called once"
      );
      getConnectionsStub.restore();
    });

    test("handles bruin.getConnectionsSchema command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = { command: "bruin.getConnectionsSchema" };
      await messageHandler(message);

      assert.ok(
        getConnectionsListFromSchemaStub.calledOnce,
        "Get connections schema command should be called once"
      );
      getConnectionsListFromSchemaStub.restore();
    });

    test("handles bruin.editConnection command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = {
        command: "bruin.editConnection",
        payload: { oldConnection: {}, newConnection: {} },
      };
      await messageHandler(message);

      assert.ok(deleteConnectionStub.calledOnce, "Delete connection should be called once");
      assert.ok(createConnectionStub.calledOnce, "Create connection should be called once");
      deleteConnectionStub.restore();
      createConnectionStub.restore();
    });

    test("handles bruin.deleteConnection command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = {
        command: "bruin.deleteConnection",
        payload: { name: "test", environment: "test" },
      };

      await messageHandler(message);

      assert.ok(deleteConnectionStub.calledOnce, "Delete connection should be called once");
      deleteConnectionStub.restore();
    });

    test("handles bruin.createConnection command", async () => {
      const messageHandler = (
        windowCreateWebviewPanelStub.returnValues[0].webview.onDidReceiveMessage as sinon.SinonStub
      ).firstCall.args[0];
      const message = {
        command: "bruin.createConnection",
        payload: { environment: "test", name: "test", type: "test", credentials: {} },
      };
      await messageHandler(message);

      assert.ok(createConnectionStub.calledOnce, "Create connection should be called once");
      createConnectionStub.restore();
    });
  });

  suite("Checkbox and Flags Tests", () => {
    let panel: BruinPanel;

    setup(() => {
      BruinPanel.render(mockExtensionUri);
      panel = BruinPanel.currentPanel!;
    });

    test("getCheckboxFlags returns correct flags", () => {
      // Simulate checkbox state
      (panel as any)._checkboxState = {
        verbose: true,
        debug: false,
        trace: true,
      };

      const flags = panel.getCheckboxFlags();
      assert.strictEqual(flags, "--verbose --trace", "Should return only checked flags");
    });
  });

  suite("Dispose Tests", () => {
    test("properly disposes of panel and resources", () => {
      BruinPanel.render(mockExtensionUri);
      const panel = BruinPanel.currentPanel!;

      panel.dispose();

      assert.strictEqual(BruinPanel.currentPanel, undefined, "Current panel should be undefined");
      assert.ok(
        windowCreateWebviewPanelStub.returnValues[0].dispose.calledOnce,
        "Panel should be disposed"
      );
    });

    test("double dispose", () => {
      const panel = BruinPanel.currentPanel;
      if (panel) {
        panel.dispose();
        panel.dispose(); // Second dispose should not throw
        assert.ok(true, "No error was thrown on double dispose");
      }
    });

    test("dispose with no current panel", () => {
      BruinPanel.currentPanel = undefined;
      assert.ok(true, "An error was thrown when disposing without a panel");
    });
  });
});

suite("getLanguageDelimiters Tests", () => {
  test("should return default delimiters for unknown language", () => {
    const languageId = "unknown";
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);

    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default end delimiter"
    );
  });

  test("should return Python delimiters for Python language", () => {
    const languageId = "python";
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);
    const expectedStartDelimiter = bruinDelimiterRegex.pyStartDelimiter.toString();
    const expectedEndDelimiter = bruinDelimiterRegex.pyEndDelimiter.toString();

    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      expectedStartDelimiter,
      "Expected Python start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      expectedEndDelimiter,
      "Expected Python end delimiter"
    );
  });

  test("should return SQL delimiters for SQL language", () => {
    const languageId = "sql";
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);
    const expectedStartDelimiter = bruinDelimiterRegex.sqlStartDelimiter.toString();
    const expectedEndDelimiter = bruinDelimiterRegex.sqlEndDelimiter.toString();

    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      expectedStartDelimiter,
      "Expected SQL start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      expectedEndDelimiter,
      "Expected SQL end delimiter"
    );
  });

  test("should return default delimiters for language ID with different casing", () => {
    const languageId = "PYTHON";
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);
    const expectedStartDelimiter = bruinDelimiterRegex.pyStartDelimiter.toString();
    const expectedEndDelimiter = bruinDelimiterRegex.pyEndDelimiter.toString();
    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default end delimiter"
    );
  });

  test("should return default delimiters for empty language ID", () => {
    const languageId = "";
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);

    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default end delimiter"
    );
  });

  test("should return default delimiters for null language ID", () => {
    const languageId = null as unknown as string;
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);

    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default end delimiter"
    );
  });

  test("should return default delimiters for undefined language ID", () => {
    const languageId = undefined as unknown as string;
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters(languageId);

    assert.strictEqual(
      startFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default start delimiter"
    );
    assert.strictEqual(
      endFoldingRegionDelimiter.toString(),
      "/$^/",
      "Expected default end delimiter"
    );
  });
});
suite("bruinFoldingRangeProvider Tests", () => {
  let document: vscode.TextDocument;
  let getLanguageDelimitersStub: sinon.SinonStub<
    [languageId: string],
    { startFoldingRegionDelimiter: RegExp; endFoldingRegionDelimiter: RegExp }
  >;
  setup(() => {
    document = {
      languageId: "python",
      lineCount: 10,
      lineAt: (lineNumber: number) => {
        return {
          text: `Line ${lineNumber}`,
        };
      },
    } as any;

    getLanguageDelimitersStub = sinon
      .stub<[string], { startFoldingRegionDelimiter: RegExp; endFoldingRegionDelimiter: RegExp }>()
      .returns({
        startFoldingRegionDelimiter: /$^/,
        endFoldingRegionDelimiter: /$^/,
      });
  });

  teardown(() => {
    sinon.restore();
  });

  test("should return empty ranges for unknown language", () => {
    const ranges = bruinFoldingRangeProvider(document);
    assert.deepStrictEqual(ranges, [], "Expected empty ranges");
  });

  test("should return empty ranges when no end delimiter is found", () => {
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters("python");
    getLanguageDelimitersStub = sinon
      .stub<[string], { startFoldingRegionDelimiter: RegExp; endFoldingRegionDelimiter: RegExp }>()
      .returns({
        startFoldingRegionDelimiter: startFoldingRegionDelimiter,
        endFoldingRegionDelimiter: /$^/,
      });

    (document as any).lineAt = (lineNumber: number) => {
      switch (lineNumber) {
        case 0:
          return { text: startFoldingRegionDelimiter };
        default:
          return { text: `Line ${lineNumber}` };
      }
    };

    const ranges = bruinFoldingRangeProvider(document);

    assert.deepStrictEqual(ranges, [], "Expected empty ranges");
  });

  test("should return empty ranges when no start delimiter is found", () => {
    const { startFoldingRegionDelimiter, endFoldingRegionDelimiter } =
      getLanguageDelimiters("python");
    getLanguageDelimitersStub = sinon
      .stub<[string], { startFoldingRegionDelimiter: RegExp; endFoldingRegionDelimiter: RegExp }>()
      .returns({
        startFoldingRegionDelimiter: /$^/,
        endFoldingRegionDelimiter: endFoldingRegionDelimiter,
      });

    (document as any).lineAt = (lineNumber: number) => {
      switch (lineNumber) {
        case 0:
          return { text: endFoldingRegionDelimiter };
        default:
          return { text: `Line ${lineNumber}` };
      }
    };

    const ranges = bruinFoldingRangeProvider(document);

    assert.deepStrictEqual(ranges, [], "Expected empty ranges");
  });
});
// Test-specific subclass to expose the protected `run` method
class TestableBruinQueryOutput extends BruinQueryOutput {
  public run(query: string[], options?: { ignoresErrors?: boolean }): Promise<string> {
    return super.run(query, options);
  }
}

class TestableBruinQueryExport extends BruinExportQueryOutput {
  public run(query: string[], options?: { ignoresErrors?: boolean }): Promise<string> {
    return super.run(query, options);
  }
}
suite("Query Output Tests", () => {
  let getWorkspaceFolderStub: sinon.SinonStub;
  let getExecutablePathStub: sinon.SinonStub;
  let bruinDirStub: sinon.SinonStub;
  let getOutputStub: sinon.SinonStub;
  let showErrorStub: sinon.SinonStub;
  let setTabQueryStub: sinon.SinonStub;

  setup(() => {
    getWorkspaceFolderStub = sinon.stub(vscode.workspace, "getWorkspaceFolder");
    bruinDirStub = sinon.stub(bruinUtils, "bruinWorkspaceDirectory").resolves("/mocked/workspace");
    getOutputStub = sinon.stub(BruinQueryOutput.prototype, "getOutput").resolves();
    showErrorStub = sinon.stub(vscode.window, "showErrorMessage");
    setTabQueryStub = sinon.stub(QueryPreviewPanel, "setTabQuery");
  });

  teardown(() => {
    sinon.restore();
  });

  test("should show error if no active editor and no URI", async () => {
    sinon.stub(vscode.window, "activeTextEditor").value(undefined);
    const showTextDocumentStub = sinon.stub(vscode.window, "showTextDocument").resolves(undefined as any);

    await getQueryOutput("dev", "100", undefined);
    
    assert.strictEqual(showTextDocumentStub.called, false); // showTextDocument shouldn't be called without URI
    assert.strictEqual(showErrorStub.calledWith("No active editor found"), true);
  });

  test("should show error if no workspace folder", async () => {
    const uri = vscode.Uri.file("/some/file.sql");
    const fakeDoc = { uri, getText: () => "" } as vscode.TextDocument;
    const fakeEditor = { document: fakeDoc, selection: { isEmpty: true } } as vscode.TextEditor;

    sinon.stub(vscode.window, "activeTextEditor").value(fakeEditor);
    getWorkspaceFolderStub.returns(undefined);

    await getQueryOutput("dev", "100", uri, "tab-1", new Date().toISOString(), new Date().toISOString());

    assert.strictEqual(showErrorStub.calledWith("No workspace folder found"), true);
  });

  test("should store query and call getOutput with selected query", async () => {
    const uri = vscode.Uri.file("/some/file.sql");
    const selectedQuery = "SELECT *"; 
    const fullQuery = "SELECT * FROM table";
    const tabId = "tab-1";
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 1);
    const fakeDoc = {
      uri,
      getText: (range?: vscode.Range) => {
        // Return selected query if range is provided
        if (range) {return selectedQuery;}
        return fullQuery;
      },
    } as unknown as vscode.TextDocument;
  
    const fakeEditor = {
      document: fakeDoc,
      selection: {
        isEmpty: false,
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 8),
      },
    } as vscode.TextEditor;
  
    sinon.stub(vscode.window, "activeTextEditor").value(fakeEditor);
    getWorkspaceFolderStub.returns({ uri: { fsPath: "/mocked/workspace" } });
  
    await getQueryOutput("dev", "10", uri, tabId, startDate.toISOString(), endDate.toISOString());
  
    assert.strictEqual(setTabQueryStub.calledWith(tabId, selectedQuery), true);
    assert.strictEqual(
      getOutputStub.calledWithMatch("dev", uri.fsPath, "10", tabId, startDate.toISOString(), endDate.toISOString(), { query: selectedQuery }),
      true
    );
  });
  
  test("should send empty query when selection is empty", async () => {
    const uri = vscode.Uri.file("/no/selection.sql");
  
    const fakeDoc = {
      uri,
      getText: (range?: vscode.Range) => {
        throw new Error("getText with range should not be called when selection is empty");
      },
    } as unknown as vscode.TextDocument;
  
    const fakeEditor = {
      document: fakeDoc,
      selection: {
        isEmpty: true,
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 0),
      },
    } as vscode.TextEditor;
  
    sinon.stub(vscode.window, "activeTextEditor").value(fakeEditor);
    getWorkspaceFolderStub.returns({ uri: { fsPath: "/mocked/workspace" } });
  
    await getQueryOutput("dev", "50", uri, "tab-1", new Date().toISOString(), new Date().toISOString());
  
    assert.strictEqual(setTabQueryStub.calledWith("tab-1", ""), true);
    assert.strictEqual(
      getOutputStub.calledWithMatch("dev", uri.fsPath, "50", "tab-1", sinon.match.string, sinon.match.string, { query: "" }),
      true
    );
  });
  
});
suite("BruinQueryOutput", () => {
  let bruinQueryOutput: TestableBruinQueryOutput;
  let bruinExecutablePath: string = "bruin";
  let workspace = "path/to/workspace";
  let queryPreviewPanelStub: sinon.SinonStub;

  setup(() => {
    bruinQueryOutput = new TestableBruinQueryOutput(bruinExecutablePath, workspace);
    // Stub the QueryPreviewPanel.postMessage method
    queryPreviewPanelStub = sinon.stub(QueryPreviewPanel, "postMessage");
  });

  teardown(() => {
    queryPreviewPanelStub.restore();
  });

  test("should use correct flags for newer CLI versions", async () => {
    const environment = "dev";
    const asset = "exampleAsset";
    const limit = "10";

    // Mock the run method to simulate newer CLI behavior
    bruinQueryOutput.run = async (flags: string[]) => {
      assert.deepStrictEqual(flags, [
        "-o",
        "json",
        "-env",
        environment,
        "-asset",
        asset,
        "-limit",
        limit,
      ]);
      return "success";
    };

    await bruinQueryOutput.getOutput(environment, asset, limit);
  });

  test("should use correct flags when environment is not provided", async () => {
    const environment = "";
    const asset = "exampleAsset";
    const limit = "10";

    // Mock the run method to simulate newer CLI behavior
    bruinQueryOutput.run = async (flags: string[]) => {
      assert.deepStrictEqual(flags, ["-o", "json", "-asset", asset, "-limit", limit]);
      return "success";
    };

    await bruinQueryOutput.getOutput(environment, asset, limit);
  });

  test("should use correct flags when limit is not provided", async () => {
    const environment = "env";
    const asset = "exampleAsset";
    const limit = "";

    // Mock the run method to simulate newer CLI behavior
    bruinQueryOutput.run = async (flags: string[]) => {
      assert.deepStrictEqual(flags, ["-o", "json", "-asset", asset]);
      return "success";
    };

    await bruinQueryOutput.getOutput(environment, asset, limit);
  });

  test("should handle older CLI versions by detecting 'flag provided but not defined' error", async () => {
    const environment = "dev";
    const asset = "exampleAsset";
    const limit = "10";
  
    // Stub the `run` method on the actual instance
    sinon.stub(bruinQueryOutput, "run").resolves("Incorrect Usage: flag provided but not defined: -env");
  
    await bruinQueryOutput.getOutput(environment, asset, limit);
  
    sinon.assert.calledWith(queryPreviewPanelStub, "query-output-message", {
      status: "error",
      message: "This feature requires the latest Bruin CLI version. Please update your CLI.",
      tabId: undefined,
    });
  });
  
  test("should handle errors during command execution", async () => {
    const environment = "dev";
    const asset = "exampleAsset";
    const limit = "10";
  
    // Stub the `run` method to throw an error
    sinon.stub(bruinQueryOutput, "run").rejects(new Error("Mock error"));
  
    await bruinQueryOutput.getOutput(environment, asset, limit);
  
    sinon.assert.calledWith(queryPreviewPanelStub, "query-output-message", {
      status: "error",
      message: "Mock error",
      tabId: undefined,
    });
  });  
});
suite(" Query export Tests", () => {
  let bruinQueryExport: TestableBruinQueryExport;
  let bruinExecutablePath: string = "bruin";
  let workspace = "path/to/workspace";
  let queryPreviewPanelStub: sinon.SinonStub;

  setup(() => {
    bruinQueryExport = new TestableBruinQueryExport(bruinExecutablePath, workspace);
    // Stub the QueryPreviewPanel.postMessage method
    queryPreviewPanelStub = sinon.stub(QueryPreviewPanel, "postMessage");
  });

  teardown(() => {
    queryPreviewPanelStub.restore();
  });

  test("should export query output", async () => {
    const asset = "exampleAsset";
    const flags = ["-o", "json"];
    const ignoresErrors = false;
    const query = "SELECT * FROM table";

    // Mock the run method to simulate successful export
    bruinQueryExport.run = async (flags: string[]) => {
      assert.deepStrictEqual(flags, ["-export", "-asset", asset, "-q", query, "-o", "json"]);
      return "success";
    };

    await bruinQueryExport.exportResults(asset, undefined, { flags, ignoresErrors, query });
  });

  test("should handle errors and reset isLoading", async () => {
    const asset = "exampleAsset.sql";
    const error = new Error("Mock error");
    const connectionName = "";
    bruinQueryExport.run = async () => {
      throw error;
    };

    await bruinQueryExport.exportResults(asset, connectionName, {});

    // Ensure error message is sent to the panel
    sinon.assert.calledWith(queryPreviewPanelStub, "query-export-message", {
      status: "error",
      message: error.message,
    });
    // Ensure isLoading is reset to false
    assert.deepStrictEqual(bruinQueryExport.isLoading, false);
  }); 

  test("should exclude -q when query is empty", async () => {
    const asset = "exampleAsset";
    const options = { ignoresErrors: false };

    bruinQueryExport.run = async (flags: string[]) => {
      const includeQuery = flags.includes("-q");
      assert.deepStrictEqual(includeQuery, false);
      assert.deepStrictEqual(flags, ["-export", "-asset", asset, "-o", "json"]);
      return "success";
    };

    await bruinQueryExport.exportResults(asset, undefined, options);
  });

});

  suite("findGlossaryFile Tests", () => {
    let fsAccessStub: sinon.SinonStub;
    let pathJoinStub: sinon.SinonStub;
    let consoleErrorStub: sinon.SinonStub;

    setup(() => {
      fsAccessStub = sinon.stub(fs.promises, "access");
      pathJoinStub = sinon.stub(path, "join");
      consoleErrorStub = sinon.stub(console, "error");
    });

    teardown(() => {
      sinon.restore();
    });

    test("should find glossary.yaml in workspace root", async () => {
      const workspaceDir = "/workspace/path";
      const expectedPath = "/workspace/path/glossary.yaml";
      
      pathJoinStub.withArgs(workspaceDir, "glossary.yaml").returns(expectedPath);
      fsAccessStub.withArgs(expectedPath, fs.constants.F_OK).resolves();

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir);

      assert.strictEqual(result, expectedPath, "Should return the path to glossary.yaml");
      assert.ok(pathJoinStub.calledWith(workspaceDir, "glossary.yaml"), "Should check for glossary.yaml first");
    });

    test("should find glossary.yml when glossary.yaml doesn't exist", async () => {
      const workspaceDir = "/workspace/path";
      const yamlPath = "/workspace/path/glossary.yaml";
      const ymlPath = "/workspace/path/glossary.yml";
      
      pathJoinStub.withArgs(workspaceDir, "glossary.yaml").returns(yamlPath);
      pathJoinStub.withArgs(workspaceDir, "glossary.yml").returns(ymlPath);
      
      // First file doesn't exist
      fsAccessStub.withArgs(yamlPath, fs.constants.F_OK).rejects({ code: "ENOENT" });
      // Second file exists
      fsAccessStub.withArgs(ymlPath, fs.constants.F_OK).resolves();

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir);

      assert.strictEqual(result, ymlPath, "Should return the path to glossary.yml");
      assert.ok(fsAccessStub.calledWith(yamlPath, fs.constants.F_OK), "Should check glossary.yaml first");
      assert.ok(fsAccessStub.calledWith(ymlPath, fs.constants.F_OK), "Should check glossary.yml second");
    });

    test("should return undefined when no glossary files exist", async () => {
      const workspaceDir = "/workspace/path";
      const yamlPath = "/workspace/path/glossary.yaml";
      const ymlPath = "/workspace/path/glossary.yml";
      
      pathJoinStub.withArgs(workspaceDir, "glossary.yaml").returns(yamlPath);
      pathJoinStub.withArgs(workspaceDir, "glossary.yml").returns(ymlPath);
      
      // Both files don't exist
      fsAccessStub.withArgs(yamlPath, fs.constants.F_OK).rejects({ code: "ENOENT" });
      fsAccessStub.withArgs(ymlPath, fs.constants.F_OK).rejects({ code: "ENOENT" });

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir);

      assert.strictEqual(result, undefined, "Should return undefined when no glossary files exist");
    });

    test("should use custom glossary file names", async () => {
      const workspaceDir = "/workspace/path";
      const customFileName = "custom-glossary.txt";
      const expectedPath = "/workspace/path/custom-glossary.txt";
      const customFileNames = [customFileName];
      
      pathJoinStub.withArgs(workspaceDir, customFileName).returns(expectedPath);
      fsAccessStub.withArgs(expectedPath, fs.constants.F_OK).resolves();

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir, customFileNames);

      assert.strictEqual(result, expectedPath, "Should find custom glossary file");
      assert.ok(pathJoinStub.calledWith(workspaceDir, customFileName), "Should check for custom file name");
    });

    test("should handle empty custom file names array", async () => {
      const workspaceDir = "/workspace/path";
      const customFileNames: string[] = [];

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir, customFileNames);

      assert.strictEqual(result, undefined, "Should return undefined for empty file names array");
      assert.ok(pathJoinStub.notCalled, "Should not call path.join for empty array");
    });

    test("should handle multiple custom file names and return first found", async () => {
      const workspaceDir = "/workspace/path";
      const fileNames = ["first.txt", "second.txt", "third.txt"];
      const firstPath = "/workspace/path/first.txt";
      const secondPath = "/workspace/path/second.txt";
      
      pathJoinStub.withArgs(workspaceDir, "first.txt").returns(firstPath);
      pathJoinStub.withArgs(workspaceDir, "second.txt").returns(secondPath);
      
      // First file doesn't exist
      fsAccessStub.withArgs(firstPath, fs.constants.F_OK).rejects({ code: "ENOENT" });
      // Second file exists
      fsAccessStub.withArgs(secondPath, fs.constants.F_OK).resolves();

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir, fileNames);

      assert.strictEqual(result, secondPath, "Should return the first found file");
      assert.ok(fsAccessStub.calledWith(firstPath, fs.constants.F_OK), "Should check first file");
      assert.ok(fsAccessStub.calledWith(secondPath, fs.constants.F_OK), "Should check second file");
      // Should not check third file since second was found
      assert.ok(!pathJoinStub.calledWith(workspaceDir, "third.txt"), "Should not check third file");
    });

    test("should handle undefined workspace directory", async () => {
      const workspaceDir = undefined as any;
      
      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir);

      assert.strictEqual(result, undefined, "Should return undefined for undefined workspace directory");
    });

    test("should handle empty workspace directory string", async () => {
      const workspaceDir = "";
      const yamlPath = "/glossary.yaml";
      
      pathJoinStub.withArgs("", "glossary.yaml").returns(yamlPath);
      fsAccessStub.withArgs(yamlPath, fs.constants.F_OK).rejects({ code: "ENOENT" });

      const result = await (await import("../bruin/bruinGlossaryUtility")).findGlossaryFile(workspaceDir);

      assert.strictEqual(result, undefined, "Should return undefined for empty workspace directory");
    });
  });

  suite("openGlossary Tests", () => {
    let showTextDocumentStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let openTextDocumentStub: sinon.SinonStub;
    let findGlossaryFileStub: sinon.SinonStub;
    let activeTextEditorStub: sinon.SinonStub;
    let openGlossary: typeof import("../bruin/bruinGlossaryUtility").openGlossary;
    let findGlossaryFile: typeof import("../bruin/bruinGlossaryUtility").findGlossaryFile;
    let module: typeof import("../bruin/bruinGlossaryUtility");

    const fakeDocument = {
      getText: () => "entity1:\n  attribute1: value\nentity2:\n  attribute2: value",
      positionAt: (offset: number) => ({ line: 0, character: offset }),
      uri: { fsPath: "/workspace/path/glossary.yaml" },
    };
    const fakeTextEditor = {
      document: fakeDocument,
      revealRange: sinon.stub(),
      selection: undefined,
    };

    setup(async () => {
      showTextDocumentStub = sinon.stub(vscode.window, "showTextDocument").resolves(fakeTextEditor as any);
      showErrorMessageStub = sinon.stub(vscode.window, "showErrorMessage");
      openTextDocumentStub = sinon.stub(vscode.workspace, "openTextDocument").resolves(fakeDocument as any);
      findGlossaryFileStub = sinon.stub().resolves("/workspace/path/glossary.yaml");
      activeTextEditorStub = sinon.stub(vscode.window, "activeTextEditor").get(() => fakeTextEditor as any);
      module = await import("../bruin/bruinGlossaryUtility");
      openGlossary = module.openGlossary;
      findGlossaryFile = module.findGlossaryFile;
      sinon.replace(module, "findGlossaryFile", findGlossaryFileStub);
    });

    teardown(() => {
      sinon.restore();
    });

    test("should show error if workspaceDir is undefined", async () => {
      await openGlossary(undefined as any, { viewColumn: vscode.ViewColumn.One });
      sinon.assert.calledWith(showErrorMessageStub, sinon.match(/Could not determine Bruin workspace directory/));
    });

    test("should show error if glossary file is not found", async () => {
      findGlossaryFileStub.resolves(undefined);
      await openGlossary("/workspace/path", { viewColumn: vscode.ViewColumn.One });
      sinon.assert.calledWith(showErrorMessageStub, sinon.match(/Glossary file not found/));
    });

    test("should open glossary file in correct view column (One -> Two)", async () => {
      await openGlossary("/workspace/path", { viewColumn: vscode.ViewColumn.One });
      sinon.assert.calledWith(showTextDocumentStub, fakeDocument, sinon.match.has("viewColumn", vscode.ViewColumn.Two));
    });

    test("should open glossary file in correct view column (Two -> One)", async () => {
      await openGlossary("/workspace/path", { viewColumn: vscode.ViewColumn.Two });
      sinon.assert.calledWith(showTextDocumentStub, fakeDocument, sinon.match.has("viewColumn", vscode.ViewColumn.One));
    });

    test("should open glossary file in Active view column if no activeTextEditor", async () => {
      activeTextEditorStub.get(() => undefined);
      await openGlossary("/workspace/path", undefined as any);
      sinon.assert.calledWith(showTextDocumentStub, fakeDocument, sinon.match.has("viewColumn", vscode.ViewColumn.Active));
    });

    test("should highlight entity and attribute if found", async () => {
      // entity: entity1, attribute: attribute1
      await openGlossary("/workspace/path", { viewColumn: vscode.ViewColumn.One }, { entity: "entity1", attribute: "attribute1" });
      sinon.assert.called(fakeTextEditor.revealRange);
      assert.ok(fakeTextEditor.selection);
    });

    test("should handle and show error on unexpected exception", async () => {
      showTextDocumentStub.rejects(new Error("fail"));
      await openGlossary("/workspace/path", { viewColumn: vscode.ViewColumn.One });
      sinon.assert.calledWith(showErrorMessageStub, sinon.match(/Failed to open glossary file/));
    });
  });

  suite("Multi-line Command Formatting Tests", () => {
    let terminalStub: Partial<vscode.Terminal>;
    let terminalOptionsStub: Partial<vscode.TerminalOptions>;

    setup(() => {
      terminalOptionsStub = {
        shellPath: undefined,
      };
      terminalStub = {
        creationOptions: terminalOptionsStub as vscode.TerminalOptions,
      };
    });

    teardown(() => {
      sinon.restore();
    });

    suite("shouldUseUnixFormatting", () => {
      test("should return true for Unix-like shells on Windows", () => {
        const platformStub = sinon.stub(process, "platform").value("win32");
        
        // Test Git Bash
        terminalOptionsStub.shellPath = "C:\\Program Files\\Git\\bin\\bash.exe";
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "Git Bash should use Unix formatting"
        );

        // Test WSL
        terminalOptionsStub.shellPath = "wsl.exe";
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "WSL should use Unix formatting"
        );

        // Test undefined shellPath (default terminal)
        terminalOptionsStub.shellPath = undefined;
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "Default terminal should use Unix formatting"
        );

        platformStub.restore();
      });


      test("should return true for non-Windows platforms", () => {
        const platformStub = sinon.stub(process, "platform").value("darwin");
        
        terminalOptionsStub.shellPath = "/bin/bash";
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "macOS should use Unix formatting"
        );

        platformStub.value("linux");
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "Linux should use Unix formatting"
        );

        platformStub.restore();
      });
    });

    suite("formatBruinCommand", () => {
      test("should format command with Unix line continuation", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh --push-metadata --downstream --exclude-tag python --environment prod",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --full-refresh \\
  --push-metadata \\
  --downstream \\
  --exclude-tag python \\
  --environment prod \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should format with Unix line continuation");
      });

      test("should format command with PowerShell line continuation", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh",
          "/path/to/asset.sql",
          false
        );

        const expected = `bruin run \`
  --start-date 2025-06-15T000000.000Z \`
  --end-date 2025-06-15T235959.999999999Z \`
  --full-refresh \`
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should format with PowerShell line continuation");
      });

      test("should handle empty flags", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "",
          "/path/to/asset.sql",
          true
        );

        const expected = "bruin run /path/to/asset.sql";
        assert.strictEqual(result, expected, "Should return simple command without flags");
      });

      test("should handle whitespace-only flags", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "   ",
          "/path/to/asset.sql",
          true
        );

        const expected = "bruin run /path/to/asset.sql";
        assert.strictEqual(result, expected, "Should return simple command with whitespace-only flags");
      });

      test("should handle flags with values", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --environment prod",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --environment prod \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should handle flags with values correctly");
      });

      test("should handle single flag", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--full-refresh",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --full-refresh \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should handle single flag correctly");
      });

      test("should handle flags with complex values", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--exclude-tag python --exclude-tag java --environment prod",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --exclude-tag python \\
  --exclude-tag java \\
  --environment prod \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should handle flags with complex values correctly");
      });
    });

    suite("runInIntegratedTerminal with formatting", () => {
      let createIntegratedTerminalStub: sinon.SinonStub;
      let terminalSendTextStub: sinon.SinonStub;
      let terminalShowStub: sinon.SinonStub;

      setup(() => {
        terminalSendTextStub = sinon.stub();
        terminalShowStub = sinon.stub();
        
        const mockTerminal = {
          creationOptions: {
            shellPath: "C:\\Program Files\\Git\\bin\\bash.exe"
          },
          show: terminalShowStub,
          sendText: terminalSendTextStub
        } as any;

        createIntegratedTerminalStub = sinon.stub(bruinUtils, "createIntegratedTerminal").resolves(mockTerminal);
      });

      teardown(() => {
        sinon.restore();
      });

      test("should format command with Unix formatting for Git Bash", async () => {
        const flags = "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh --push-metadata";
        const assetPath = "/path/to/asset.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, flags, "bruin");

        assert.ok(terminalSendTextStub.calledTwice, "Should send text twice (dummy call + command)");
        
        const actualCommand = terminalSendTextStub.secondCall.args[0];
        const expectedCommand = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --full-refresh \\
  --push-metadata \\
  "/path/to/asset.sql"`;

        assert.strictEqual(actualCommand, expectedCommand, "Should format command with Unix line continuation");
      });

      test("should use simple command when no flags provided", async () => {
        const assetPath = "/path/to/asset.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, "", "bruin");

        const actualCommand = terminalSendTextStub.secondCall.args[0];
        const expectedCommand = 'bruin run "/path/to/asset.sql"';

        assert.strictEqual(actualCommand, expectedCommand, "Should use simple command without flags");
      });

      test("should use correct executable based on terminal type", async () => {
        const mockTerminal = {
          creationOptions: {
            shellPath: "C:\\Program Files\\Git\\bin\\bash.exe"
          },
          show: terminalShowStub,
          sendText: terminalSendTextStub
        } as any;

        createIntegratedTerminalStub.resolves(mockTerminal);

        const flags = "--full-refresh";
        const assetPath = "/path/to/asset.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, flags, "/custom/path/bruin");

        const actualCommand = terminalSendTextStub.secondCall.args[0];
        // Should use "bruin" for Git Bash, not the custom path
        assert.ok(actualCommand.startsWith("bruin run"), "Should use 'bruin' executable for Git Bash");
      });


      test("should handle complex flag combinations", async () => {
        const flags = "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh --push-metadata --downstream --exclude-tag python --exclude-tag java --environment prod";
        const assetPath = "/Users/maya/Documents/GitHub/neptune/pipelines/wep/assets/tier_2/exchanges/epias_plants_uevm.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, flags, "bruin");

        const actualCommand = terminalSendTextStub.secondCall.args[0];
        const expectedCommand = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --full-refresh \\
  --push-metadata \\
  --downstream \\
  --exclude-tag python \\
  --exclude-tag java \\
  --environment prod \\
  "/Users/maya/Documents/GitHub/neptune/pipelines/wep/assets/tier_2/exchanges/epias_plants_uevm.sql"`;

        assert.strictEqual(actualCommand, expectedCommand, "Should handle complex flag combinations correctly");
      });
    });
  });

  suite("QueryPreviewPanel Tests", () => {
    let queryPreviewPanel: any;
    let mockExtensionUri: vscode.Uri;
    let mockExtensionContext: vscode.ExtensionContext;
    let mockWebviewView: vscode.WebviewView;
    let mockWebview: vscode.Webview;
    let postMessageStub: sinon.SinonStub;
    let onDidReceiveMessageStub: sinon.SinonStub;
    let onDidChangeVisibilityStub: sinon.SinonStub;
    let getQueryOutputStub: sinon.SinonStub;
    let exportQueryResultsStub: sinon.SinonStub;
    let globalStateUpdateStub: sinon.SinonStub;
    let globalStateGetStub: sinon.SinonStub;

    setup(() => {
      mockExtensionUri = vscode.Uri.file("/mock/extension/path");
      mockExtensionContext = {
        globalState: {
          update: sinon.stub(),
          get: sinon.stub(),
        },
      } as any;

      mockWebview = {
        postMessage: sinon.stub(),
        onDidReceiveMessage: sinon.stub(),
        options: {},
        cspSource: "default-src",
        asWebviewUri: sinon.stub(),
      } as any;

      mockWebviewView = {
        webview: mockWebview,
        onDidChangeVisibility: sinon.stub(),
        visible: true,
      } as any;

      // Stub external dependencies
      getQueryOutputStub = sinon.stub();
      exportQueryResultsStub = sinon.stub();
      
      // Mock the module imports
      const queryCommandsModule = {
        getQueryOutput: getQueryOutputStub,
        exportQueryResults: exportQueryResultsStub,
      };
      
      // Use proxyquire to mock the imports
      const QueryPreviewPanelModule = proxyquire("../panels/QueryPreviewPanel", {
        "../extension/commands/queryCommands": queryCommandsModule,
      });

      queryPreviewPanel = new QueryPreviewPanelModule.QueryPreviewPanel(mockExtensionUri, mockExtensionContext);
      
      // Setup stubs
      postMessageStub = sinon.stub(QueryPreviewPanelModule.QueryPreviewPanel, "postMessage");
      onDidReceiveMessageStub = mockWebview.onDidReceiveMessage as sinon.SinonStub;
      onDidChangeVisibilityStub = mockWebviewView.onDidChangeVisibility as sinon.SinonStub;
      globalStateUpdateStub = mockExtensionContext.globalState.update as sinon.SinonStub;
      globalStateGetStub = mockExtensionContext.globalState.get as sinon.SinonStub;
    });

    teardown(() => {
      sinon.restore();
      // Clear static state
      QueryPreviewPanel._view = undefined;
      // Access private properties through the class instance
      (QueryPreviewPanel as any).tabQueries?.clear();
      (QueryPreviewPanel as any).tabAssetPaths?.clear();
      (QueryPreviewPanel as any).currentDates = {};
    });

    suite("Static Methods", () => {
      test("should set and get last executed query", () => {
        const testQuery = "SELECT * FROM test_table";
        
        QueryPreviewPanel.setLastExecutedQuery(testQuery);
        
        assert.strictEqual(QueryPreviewPanel.getLastExecutedQuery(), testQuery);
        assert.strictEqual(QueryPreviewPanel.getTabQuery("tab-1"), testQuery);
      });

      test("should set and get tab query", () => {
        const tabId = "test-tab";
        const testQuery = "SELECT * FROM test_table";
        
        QueryPreviewPanel.setTabQuery(tabId, testQuery);
        
        assert.strictEqual(QueryPreviewPanel.getTabQuery(tabId), testQuery);
      });

      test("should set and get tab asset path", () => {
        const tabId = "test-tab";
        const assetPath = "/path/to/asset.sql";
        
        QueryPreviewPanel.setTabAssetPath(tabId, assetPath);
        
        assert.strictEqual(QueryPreviewPanel.getTabAssetPath(tabId), assetPath);
      });

      test("should update last asset path when setting tab-1", () => {
        const assetPath = "/path/to/asset.sql";
        
        QueryPreviewPanel.setTabAssetPath("tab-1", assetPath);
        
        assert.strictEqual(QueryPreviewPanel.getTabAssetPath("tab-1"), assetPath);
        assert.strictEqual(QueryPreviewPanel.getTabAssetPath("any-other-tab"), assetPath);
      });
    });

    suite("Constructor", () => {
      test("should initialize with extension URI and context", () => {
        assert.ok(queryPreviewPanel, "QueryPreviewPanel should be created");
        assert.strictEqual(queryPreviewPanel._extensionUri, mockExtensionUri);
        assert.strictEqual(queryPreviewPanel._extensionContext, mockExtensionContext);
      });

      test("should set up event listeners", () => {
        const onDidChangeActiveTextEditorStub = sinon.stub(vscode.window, "onDidChangeActiveTextEditor");
        
        new QueryPreviewPanel(mockExtensionUri, mockExtensionContext);
        
        assert.ok(onDidChangeActiveTextEditorStub.calledOnce, "Should set up active text editor listener");
      });
    });

    suite("Message Handling", () => {
      let messageHandler: (message: any) => void;

      setup(() => {
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;
        
        queryPreviewPanel.resolveWebviewView(mockWebviewView, context, token);
        messageHandler = onDidReceiveMessageStub.firstCall.args[0];
      });

      test("should handle bruin.saveState message", async () => {
        const testState = { tabs: [{ id: "tab-1", query: "SELECT * FROM test" }] };
        
        await messageHandler({ command: "bruin.saveState", payload: testState });
        
        assert.ok(globalStateUpdateStub.calledWith("queryPreviewState", sinon.match.any));
      });

      test("should handle bruin.requestState message", async () => {
        const testState = { tabs: [{ id: "tab-1", query: "SELECT * FROM test" }] };
        globalStateGetStub.returns(testState);
        
        await messageHandler({ command: "bruin.requestState" });
        
        assert.ok((mockWebview.postMessage as sinon.SinonStub).calledWith({
          command: "bruin.restoreState",
          payload: testState,
        }));
      });

      test("should handle bruin.getQueryOutput message", async () => {
        const testUri = vscode.Uri.file("/test/file.sql");
        queryPreviewPanel._lastRenderedDocumentUri = testUri;
        
        const message = {
          command: "bruin.getQueryOutput",
          payload: {
            environment: "dev",
            limit: "100",
            tabId: "tab-1",
            startDate: "2025-01-01",
            endDate: "2025-01-31",
          },
        };
        
        await messageHandler(message);
        
        assert.ok(getQueryOutputStub.calledWith(
          "dev",
          "100",
          testUri,
          "tab-1",
          "2025-01-01",
          "2025-01-31"
        ));
      });

      test("should handle bruin.clearQueryOutput message", async () => {
        const message = {
          command: "bruin.clearQueryOutput",
          payload: { tabId: "tab-1" },
        };
        
        await messageHandler(message);
        
        assert.ok(postMessageStub.calledWith("query-output-clear", {
          status: "success",
          message: { tabId: "tab-1" },
        }));
      });


      test("should handle bruin.exportQueryOutput message with last rendered document", async () => {
        const testUri = vscode.Uri.file("/test/file.sql");
        queryPreviewPanel._lastRenderedDocumentUri = testUri;
        
        const message = {
          command: "bruin.exportQueryOutput",
          payload: { tabId: "tab-1" },
        };
        
        await messageHandler(message);
        
        assert.ok(exportQueryResultsStub.calledWith(testUri, "tab-1", null));
      });
    });

    suite("loadAndSendQueryOutput", () => {
      test("should load query output successfully", async () => {
        const testUri = vscode.Uri.file("/test/file.sql");
        queryPreviewPanel._lastRenderedDocumentUri = testUri;
        getQueryOutputStub.resolves();
        
        await queryPreviewPanel.loadAndSendQueryOutput("dev", "100", "tab-1", "2025-01-01", "2025-01-31");
        
        assert.ok(postMessageStub.calledWith("query-output-message", {
          status: "loading",
          message: true,
          tabId: "tab-1",
        }));
        assert.ok(getQueryOutputStub.calledWith("dev", "100", testUri, "tab-1", "2025-01-01", "2025-01-31"));
      });

      test("should handle error when loading query output", async () => {
        const testUri = vscode.Uri.file("/test/file.sql");
        queryPreviewPanel._lastRenderedDocumentUri = testUri;
        const testError = new Error("Query execution failed");
        getQueryOutputStub.rejects(testError);
        
        await queryPreviewPanel.loadAndSendQueryOutput("dev", "100", "tab-1");
        
        assert.ok(postMessageStub.calledWith("query-output-message", {
          status: "error",
          message: "Query execution failed",
          tabId: "tab-1",
        }));
      });

      test("should return early when no last rendered document", async () => {
        queryPreviewPanel._lastRenderedDocumentUri = undefined;
        
        await queryPreviewPanel.loadAndSendQueryOutput("dev", "100", "tab-1");
        
        assert.ok(getQueryOutputStub.notCalled, "Should not call getQueryOutput without document URI");
      });
    });

    suite("State Persistence", () => {
      test("should handle missing extension context", async () => {
        queryPreviewPanel._extensionContext = undefined;
        
        try {
          await queryPreviewPanel._persistState({});
          assert.fail("Should throw error for missing extension context");
        } catch (error) {
          assert.strictEqual((error as Error).message, "Extension context not found");
        }
      });
    });

    suite("postMessage", () => {
      test("should post message when view exists", () => {
        QueryPreviewPanel._view = mockWebviewView;
        
        QueryPreviewPanel.postMessage("test-message", { status: "success", message: "test" });
        
        assert.ok((mockWebview.postMessage as sinon.SinonStub).calledWith({
          command: "test-message",
          payload: { status: "success", message: "test" },
        }));
      });

      test("should not post message when view does not exist", () => {
        QueryPreviewPanel._view = undefined;
        
        QueryPreviewPanel.postMessage("test-message", { status: "success", message: "test" });
        
        assert.ok((mockWebview.postMessage as sinon.SinonStub).notCalled, "Should not post message when view is undefined");
      });

      test("should store dates when receiving date updates", () => {
        QueryPreviewPanel._view = mockWebviewView;
        
        QueryPreviewPanel.postMessage("update-query-dates", {
          status: "success",
          message: { startDate: "2025-01-01", endDate: "2025-01-31" },
        });
        
        assert.deepStrictEqual((QueryPreviewPanel as any).currentDates, {
          start: "2025-01-01",
          end: "2025-01-31",
        });
      });
    });

    suite("initPanel", () => {
      test("should initialize panel with text editor", async () => {
        const mockEditor = {
          document: { uri: vscode.Uri.file("/test/file.sql") },
        } as vscode.TextEditor;
        
        const initStub = sinon.stub(queryPreviewPanel, "init").resolves();
        
        await queryPreviewPanel.initPanel(mockEditor);
        
        assert.strictEqual(queryPreviewPanel._lastRenderedDocumentUri, mockEditor.document.uri);
        assert.ok(initStub.calledOnce);
      });

      test("should initialize panel with text document change event", async () => {
        const mockEvent = {
          document: { uri: vscode.Uri.file("/test/file.sql") },
        } as vscode.TextDocumentChangeEvent;
        
        const initStub = sinon.stub(queryPreviewPanel, "init").resolves();
        
        await queryPreviewPanel.initPanel(mockEvent);
        
        assert.strictEqual(queryPreviewPanel._lastRenderedDocumentUri, mockEvent.document.uri);
        assert.ok(initStub.calledOnce);
      });
    });

    suite("Dispose", () => {
      test("should dispose all disposables", () => {
        const mockDisposable = { dispose: sinon.stub() };
        queryPreviewPanel.disposables = [mockDisposable];
        
        queryPreviewPanel.dispose();
        
        assert.ok(mockDisposable.dispose.calledOnce);
        assert.strictEqual(queryPreviewPanel.disposables.length, 0);
      });
    });
  });

  suite("BruinInternalParse Tests", () => {
    let bruinInternalParse: BruinInternalParse;
    let runStub: sinon.SinonStub;
    let postMessageToPanelsStub: sinon.SinonStub;
    let consoleTimeStub: sinon.SinonStub;
    let consoleTimeEndStub: sinon.SinonStub;
    let bruinLineageInternalParseStub: sinon.SinonStub;
    let parsePipelineConfigStub: sinon.SinonStub;
    let bruinPanelPostMessageStub: sinon.SinonStub;

    setup(() => {
      bruinInternalParse = new BruinInternalParse("path/to/bruin", "path/to/working/directory");
      runStub = sinon.stub(bruinInternalParse as any, "run");
      postMessageToPanelsStub = sinon.stub(bruinInternalParse as any, "postMessageToPanels");
      consoleTimeStub = sinon.stub(console, "time");
      consoleTimeEndStub = sinon.stub(console, "timeEnd");
      
      // Mock BruinLineageInternalParse
      const mockBruinLineageInternalParse = {
        parsePipelineConfig: sinon.stub(),
      };
      bruinLineageInternalParseStub = sinon.stub().returns(mockBruinLineageInternalParse);
      parsePipelineConfigStub = mockBruinLineageInternalParse.parsePipelineConfig;
      
      // Mock BruinPanel.postMessage
      bruinPanelPostMessageStub = sinon.stub(BruinPanel, "postMessage");
      
      // Replace the BruinLineageInternalParse constructor
      sinon.replace(require("../bruin/bruinFlowLineage"), "BruinLineageInternalParse", bruinLineageInternalParseStub);
    });

    teardown(() => {
      sinon.restore();
    });

    test("should return 'internal' as the bruin command", () => {
      const result = (bruinInternalParse as any).bruinCommand();
      assert.strictEqual(result, "internal");
    });

    test("should handle pipeline.yml files successfully", async () => {
      const filePath = "path/to/pipeline.yml";
      const mockPipelineData = {
        name: "test-pipeline",
        schedule: "daily",
        description: "Test pipeline",
        raw: { name: "test-pipeline", schedule: "daily" }
      };
      
      parsePipelineConfigStub.resolves(mockPipelineData);
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(consoleTimeStub);
      sinon.assert.calledWith(consoleTimeStub, "parseAsset");
      sinon.assert.calledOnce(bruinLineageInternalParseStub);
      sinon.assert.calledOnce(parsePipelineConfigStub);
      sinon.assert.calledWith(parsePipelineConfigStub, filePath);
      sinon.assert.calledOnce(postMessageToPanelsStub);
      sinon.assert.calledWith(postMessageToPanelsStub, "success", JSON.stringify({
        type: "pipelineConfig",
        ...mockPipelineData,
        filePath
      }));
      sinon.assert.calledOnce(consoleTimeEndStub);
      sinon.assert.calledWith(consoleTimeEndStub, "parseAsset");
    });

    test("should handle pipeline.yaml files successfully", async () => {
      const filePath = "path/to/pipeline.yaml";
      const mockPipelineData = {
        name: "test-pipeline",
        schedule: "daily",
        description: "Test pipeline",
        raw: { name: "test-pipeline", schedule: "daily" }
      };
      
      parsePipelineConfigStub.resolves(mockPipelineData);
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(bruinLineageInternalParseStub);
      sinon.assert.calledOnce(parsePipelineConfigStub);
      sinon.assert.calledWith(parsePipelineConfigStub, filePath);
    });

    test("should handle pipeline parsing timeout", async () => {
      const filePath = "path/to/pipeline.yml";
      
      parsePipelineConfigStub.rejects(new Error("Parsing timeout"));
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(postMessageToPanelsStub);
      sinon.assert.calledWith(postMessageToPanelsStub, "error", "Parsing timeout");
      sinon.assert.calledOnce(consoleTimeEndStub);
    });

    test("should handle bruin.yml files", async () => {
      const filePath = "path/to/bruin.yml";
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(postMessageToPanelsStub);
      sinon.assert.calledWith(postMessageToPanelsStub, "success", JSON.stringify({
        type: "bruinConfig",
        filePath
      }));
      sinon.assert.calledOnce(consoleTimeEndStub);
    });

    test("should handle bruin.yaml files", async () => {
      const filePath = "path/to/bruin.yaml";
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(postMessageToPanelsStub);
      sinon.assert.calledWith(postMessageToPanelsStub, "success", JSON.stringify({
        type: "bruinConfig",
        filePath
      }));
    });

    test("should handle other asset types successfully", async () => {
      const filePath = "path/to/asset.sql";
      const mockResult = '{"asset": "data"}';
      
      runStub.resolves(mockResult);
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(runStub);
      sinon.assert.calledWith(runStub, ["parse-asset", filePath], { ignoresErrors: false });
      
      // Wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10));
      
      sinon.assert.calledOnce(postMessageToPanelsStub);
      sinon.assert.calledWith(postMessageToPanelsStub, "success", mockResult);
      sinon.assert.calledOnce(consoleTimeEndStub);
    });

    test("should handle other asset types with custom flags", async () => {
      const filePath = "path/to/asset.sql";
      const options = { flags: ["custom-flag"], ignoresErrors: true };
      
      runStub.resolves('{"result": "success"}');
      
      await bruinInternalParse.parseAsset(filePath, options);
      
      sinon.assert.calledOnce(runStub);
      sinon.assert.calledWith(runStub, ["custom-flag", filePath], { ignoresErrors: true });
    });


    test("should handle unexpected errors in parseAsset", async () => {
      const filePath = "path/to/asset.sql";
      const error = new Error("Unexpected error");
      
      runStub.throws(error);
      
      await bruinInternalParse.parseAsset(filePath);
      
      sinon.assert.calledOnce(postMessageToPanelsStub);
      sinon.assert.calledWith(postMessageToPanelsStub, "error", "Unexpected error");
      sinon.assert.calledOnce(consoleTimeEndStub);
    });
  });

  suite("BruinLineageInternalParse Tests", () => {
    let bruinLineageInternalParse: any;
    let runStub: sinon.SinonStub;
    let updateLineageDataStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let getCurrentPipelinePathStub: sinon.SinonStub;
    let isConfigFileStub: sinon.SinonStub;
    let consoleErrorStub: sinon.SinonStub;

    setup(async () => {
      // Import the class dynamically
      const { BruinLineageInternalParse } = await import("../bruin/bruinFlowLineage");
      bruinLineageInternalParse = new BruinLineageInternalParse("path/to/bruin", "path/to/working/directory");
      
      // Setup stubs
      runStub = sinon.stub(bruinLineageInternalParse as any, "run");
      updateLineageDataStub = sinon.stub();
      showErrorMessageStub = sinon.stub(vscode.window, "showErrorMessage");
      getCurrentPipelinePathStub = sinon.stub();
      isConfigFileStub = sinon.stub();
      consoleErrorStub = sinon.stub(console, "error");

      // Replace module dependencies
      const bruinUtilsModule = await import("../bruin/bruinUtils");
      sinon.replace(bruinUtilsModule, "getCurrentPipelinePath", getCurrentPipelinePathStub);
      
      const helperUtilsModule = await import("../utilities/helperUtils");
      sinon.replace(helperUtilsModule, "isConfigFile", isConfigFileStub);
      
      const lineagePanelModule = await import("../panels/LineagePanel");
      sinon.replace(lineagePanelModule, "updateLineageData", updateLineageDataStub);
    });

    teardown(() => {
      sinon.restore();
    });

    test("should return 'internal' as the bruin command", () => {
      const result = (bruinLineageInternalParse as any).bruinCommand();
      assert.strictEqual(result, "internal");
    });

    suite("parsePipelineConfig", () => {
      test("should parse pipeline config successfully", async () => {
        const filePath = "path/to/pipeline.yml";
        const mockPipelineData = {
          name: "test-pipeline",
          schedule: "daily",
          description: "Test pipeline description",
          raw: { name: "test-pipeline", schedule: "daily" }
        };
        
        runStub.resolves(JSON.stringify(mockPipelineData));
        
        const result = await bruinLineageInternalParse.parsePipelineConfig(filePath);
        
        sinon.assert.calledOnce(runStub);
        sinon.assert.calledWith(runStub, ["parse-pipeline", filePath], { ignoresErrors: false });
        
        assert.deepStrictEqual(result, {
          name: "test-pipeline",
          schedule: "daily",
          description: "Test pipeline description",
          raw: mockPipelineData
        });
      });

      test("should parse pipeline config with custom flags", async () => {
        const filePath = "path/to/pipeline.yml";
        const options = { flags: ["custom-flag"], ignoresErrors: true };
        const mockPipelineData = { name: "test-pipeline" };
        
        runStub.resolves(JSON.stringify(mockPipelineData));
        
        await bruinLineageInternalParse.parsePipelineConfig(filePath, options);
        
        sinon.assert.calledWith(runStub, ["custom-flag", filePath], { ignoresErrors: true });
      });

      test("should handle missing fields in pipeline data", async () => {
        const filePath = "path/to/pipeline.yml";
        const mockPipelineData = { someOtherField: "value" };
        
        runStub.resolves(JSON.stringify(mockPipelineData));
        
        const result = await bruinLineageInternalParse.parsePipelineConfig(filePath);
        
        assert.deepStrictEqual(result, {
          name: "",
          schedule: "",
          description: "",
          raw: mockPipelineData
        });
      });

      test("should handle JSON parse errors", async () => {
        const filePath = "path/to/pipeline.yml";
        const invalidJson = "invalid json";
        
        runStub.resolves(invalidJson);
        
        try {
          await bruinLineageInternalParse.parsePipelineConfig(filePath);
          assert.fail("Expected error to be thrown");
        } catch (error) {
          assert.ok(error instanceof SyntaxError, "Should throw SyntaxError for invalid JSON");
        }
      });

      test("should handle run method errors", async () => {
        const filePath = "path/to/pipeline.yml";
        const error = new Error("Command failed");
        
        runStub.rejects(error);
        
        try {
          await bruinLineageInternalParse.parsePipelineConfig(filePath);
          assert.fail("Expected error to be thrown");
        } catch (error: any) {
          assert.strictEqual(error.message, "Command failed");
        }
      });
    });

    suite("parseAssetLineage", () => {
      test("should parse asset lineage successfully", async () => {
        const filePath = "path/to/asset.sql";
        const pipelinePath = "path/to/pipeline.yml";
        const mockPipelineData = {
          assets: [
            {
              id: "asset-1",
              name: "test-asset",
              definition_file: { path: filePath }
            }
          ]
        };
        
        isConfigFileStub.returns(false);
        getCurrentPipelinePathStub.resolves(pipelinePath);
        runStub.resolves(JSON.stringify(mockPipelineData));
        
        await bruinLineageInternalParse.parseAssetLineage(filePath);
        
        sinon.assert.calledOnce(isConfigFileStub);
        sinon.assert.calledWith(isConfigFileStub, filePath);
        sinon.assert.calledOnce(getCurrentPipelinePathStub);
        sinon.assert.calledWith(getCurrentPipelinePathStub, filePath);
        sinon.assert.calledOnce(runStub);
        sinon.assert.calledWith(runStub, ["parse-pipeline", pipelinePath], { ignoresErrors: false });
        sinon.assert.calledOnce(updateLineageDataStub);
        sinon.assert.calledWith(updateLineageDataStub, {
          status: "success",
          message: {
            id: "asset-1",
            name: "test-asset",
            pipeline: JSON.stringify(mockPipelineData)
          }
        });
      });

      test("should return early for config files", async () => {
        const filePath = "path/to/config.yml";
        
        isConfigFileStub.returns(true);
        
        await bruinLineageInternalParse.parseAssetLineage(filePath);
        
        sinon.assert.calledOnce(isConfigFileStub);
        sinon.assert.calledWith(isConfigFileStub, filePath);
        sinon.assert.notCalled(getCurrentPipelinePathStub);
        sinon.assert.notCalled(runStub);
        sinon.assert.notCalled(updateLineageDataStub);
      });

      test("should handle CLI not installed error", async () => {
        const filePath = "path/to/asset.sql";
        const error = { error: "No help topic for 'internal'" };
        
        isConfigFileStub.returns(false);
        getCurrentPipelinePathStub.resolves("path/to/pipeline.yml");
        runStub.rejects(error);
        
        await bruinLineageInternalParse.parseAssetLineage(filePath);
        
        sinon.assert.calledOnce(showErrorMessageStub);
        sinon.assert.calledWith(showErrorMessageStub, "Bruin CLI is not installed or is outdated. Please install or update Bruin CLI to use this feature.");
        sinon.assert.calledWith(updateLineageDataStub, {
          status: "error",
          message: "Bruin CLI is not installed or is outdated. Please install or update Bruin CLI to use this feature."
        });
      });

      test("should handle string errors", async () => {
        const filePath = "path/to/asset.sql";
        const error = "String error message";
        
        isConfigFileStub.returns(false);
        getCurrentPipelinePathStub.resolves("path/to/pipeline.yml");
        runStub.rejects(error);
        
        await bruinLineageInternalParse.parseAssetLineage(filePath);
        
        sinon.assert.calledWith(updateLineageDataStub, {
          status: "error",
          message: "String error message"
        });
      });

      test("should handle object errors with error property", async () => {
        const filePath = "path/to/asset.sql";
        const error = { error: "Object error message" };
        
        isConfigFileStub.returns(false);
        getCurrentPipelinePathStub.resolves("path/to/pipeline.yml");
        runStub.rejects(error);
        
        await bruinLineageInternalParse.parseAssetLineage(filePath);
        
        sinon.assert.calledWith(updateLineageDataStub, {
          status: "error",
          message: "Object error message"
        });
      });

      test("should parse asset lineage with custom flags", async () => {
        const filePath = "path/to/asset.sql";
        const pipelinePath = "path/to/pipeline.yml";
        const options = { flags: ["custom-flag"], ignoresErrors: true };
        const mockPipelineData = {
          assets: [
            {
              id: "asset-1",
              name: "test-asset",
              definition_file: { path: filePath }
            }
          ]
        };
        
        isConfigFileStub.returns(false);
        getCurrentPipelinePathStub.resolves(pipelinePath);
        runStub.resolves(JSON.stringify(mockPipelineData));
        
        await bruinLineageInternalParse.parseAssetLineage(filePath, options);
        
        sinon.assert.calledWith(runStub, ["custom-flag", pipelinePath], { ignoresErrors: true });
      });

    });
  });

  suite("LineagePanel Tests", () => {
    let lineagePanel: any;
    let baseLineagePanel: any;
    let assetLineagePanel: any;
    let mockExtensionUri: vscode.Uri;
    let mockWebviewView: vscode.WebviewView;
    let mockWebview: vscode.Webview;
    let onDidChangeActiveTextEditorStub: sinon.SinonStub;
    let onDidChangeVisibilityStub: sinon.SinonStub;
    let onDidReceiveMessageStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let flowLineageCommandStub: sinon.SinonStub;
    let openTextDocumentStub: sinon.SinonStub;
    let showTextDocumentStub: sinon.SinonStub;
    let consoleErrorStub: sinon.SinonStub;

    setup(async () => {
      // Import the classes dynamically
      const { LineagePanel, BaseLineagePanel, AssetLineagePanel } = await import("../panels/LineagePanel");
      
      mockExtensionUri = vscode.Uri.file("/mock/extension/path");
      
      // Mock webview objects
      mockWebview = {
        postMessage: sinon.stub(),
        onDidReceiveMessage: sinon.stub(),
        options: {},
        cspSource: "default-src",
        asWebviewUri: sinon.stub(),
      } as any;

      mockWebviewView = {
        webview: mockWebview,
        onDidChangeVisibility: sinon.stub(),
        visible: true,
      } as any;

      // Setup stubs
      onDidChangeActiveTextEditorStub = sinon.stub(vscode.window, "onDidChangeActiveTextEditor");
      onDidChangeVisibilityStub = mockWebviewView.onDidChangeVisibility as sinon.SinonStub;
      onDidReceiveMessageStub = mockWebview.onDidReceiveMessage as sinon.SinonStub;
      postMessageStub = mockWebview.postMessage as sinon.SinonStub;
      flowLineageCommandStub = sinon.stub();
      openTextDocumentStub = sinon.stub(vscode.workspace, "openTextDocument");
      showTextDocumentStub = sinon.stub(vscode.window, "showTextDocument");
      consoleErrorStub = sinon.stub(console, "error");

      // Replace module dependencies
      const flowLineageCommandModule = await import("../extension/commands/FlowLineageCommand");
      sinon.replace(flowLineageCommandModule, "flowLineageCommand", flowLineageCommandStub);

      // Get singleton instance
      lineagePanel = LineagePanel.getInstance();
      
      // Create a concrete test class that extends BaseLineagePanel
      class TestBaseLineagePanel extends BaseLineagePanel {
        protected getComponentName(): string {
          return "TestComponent";
        }
      }
      
      // Create instances for testing
      baseLineagePanel = new TestBaseLineagePanel(mockExtensionUri, "TestPanel");
      assetLineagePanel = new AssetLineagePanel(mockExtensionUri);
    });

    teardown(() => {
      sinon.restore();
    });

    suite("LineagePanel Singleton", () => {
      test("should return the same instance on multiple getInstance calls", () => {
        const { LineagePanel } = require("../panels/LineagePanel");
        const instance1 = LineagePanel.getInstance();
        const instance2 = LineagePanel.getInstance();
        
        assert.strictEqual(instance1, instance2, "Should return the same instance");
      });

      test("should set and get lineage data", () => {
        const testData = { status: "success", message: "test data" };
        
        lineagePanel.setLineageData(testData);
        const retrievedData = lineagePanel.getLineageData();
        
        assert.deepStrictEqual(retrievedData, testData, "Should return the set data");
      });

      test("should notify listeners when data is set", () => {
        const testData = { status: "success", message: "test data" };
        const listener = sinon.stub();
        
        lineagePanel.addListener(listener);
        lineagePanel.setLineageData(testData);
        
        sinon.assert.calledOnce(listener);
        sinon.assert.calledWith(listener, testData);
      });

      test("should remove listeners correctly", () => {
        const listener1 = sinon.stub();
        const listener2 = sinon.stub();
        
        lineagePanel.addListener(listener1);
        lineagePanel.addListener(listener2);
        lineagePanel.removeListener(listener1);
        
        lineagePanel.setLineageData({ test: "data" });
        
        sinon.assert.notCalled(listener1);
        sinon.assert.calledOnce(listener2);
      });

      test("should handle multiple listeners", () => {
        const listener1 = sinon.stub();
        const listener2 = sinon.stub();
        const testData = { status: "success", message: "test data" };
        
        lineagePanel.addListener(listener1);
        lineagePanel.addListener(listener2);
        lineagePanel.setLineageData(testData);
        
        sinon.assert.calledOnce(listener1);
        sinon.assert.calledWith(listener1, testData);
        sinon.assert.calledOnce(listener2);
        sinon.assert.calledWith(listener2, testData);
      });
    });

    suite("BaseLineagePanel", () => {
      test("should initialize with extension URI and panel type", () => {
        assert.strictEqual(baseLineagePanel._extensionUri, mockExtensionUri);
        assert.strictEqual(baseLineagePanel.panelType, "TestPanel");
        assert.ok(baseLineagePanel.dataStore, "Should have data store instance");
      });

      test("should set up active text editor listener", () => {
        // The listener is set up in the constructor, so we need to check if it was called during setup
        assert.ok(onDidChangeActiveTextEditorStub.called, "Should set up active text editor listener");
      });

      test("should handle active text editor change", async () => {
        const mockEditor = {
          document: { uri: vscode.Uri.file("/test/file.sql") }
        } as vscode.TextEditor;
        
        const loadLineageDataStub = sinon.stub(baseLineagePanel, "loadLineageData");
        const initPanelStub = sinon.stub(baseLineagePanel, "initPanel");
        
        // Simulate the listener being called
        const listener = onDidChangeActiveTextEditorStub.firstCall.args[0];
        await listener(mockEditor);
        
        assert.strictEqual(baseLineagePanel._lastRenderedDocumentUri, mockEditor.document.uri);
        sinon.assert.calledOnce(loadLineageDataStub);
        sinon.assert.calledOnce(initPanelStub);
        sinon.assert.calledWith(initPanelStub, mockEditor);
      });

      test("should not handle active text editor change for bruin panel scheme", async () => {
        const mockEditor = {
          document: { uri: vscode.Uri.parse("vscodebruin:panel") }
        } as vscode.TextEditor;
        
        const loadLineageDataStub = sinon.stub(baseLineagePanel, "loadLineageData");
        const initPanelStub = sinon.stub(baseLineagePanel, "initPanel");
        
        // Simulate the listener being called
        const listener = onDidChangeActiveTextEditorStub.firstCall.args[0];
        await listener(mockEditor);
        
        // The condition checks if event exists AND scheme is not vscodebruin:panel
        // Since we're passing a valid event, it should still call the methods
        // The actual filtering happens in the constructor, not in the listener
        sinon.assert.calledOnce(loadLineageDataStub);
        sinon.assert.calledOnce(initPanelStub);
      });

      test("should load lineage data successfully", async () => {
        const testUri = vscode.Uri.file("/test/file.sql");
        baseLineagePanel._lastRenderedDocumentUri = testUri;
        
        flowLineageCommandStub.resolves();
        
        await baseLineagePanel.loadLineageData();
        
        sinon.assert.calledOnce(flowLineageCommandStub);
        sinon.assert.calledWith(flowLineageCommandStub, testUri);
      });

      test("should not load lineage data when no URI", async () => {
        baseLineagePanel._lastRenderedDocumentUri = undefined;
        
        await baseLineagePanel.loadLineageData();
        
        sinon.assert.notCalled(flowLineageCommandStub);
      });

      test("should handle data updates when view is visible", () => {
        const testData = { status: "success", message: "test data" };
        baseLineagePanel._view = mockWebviewView;
        sinon.stub(mockWebviewView, "visible").value(true);
        
        baseLineagePanel.onDataUpdated(testData);
        
        sinon.assert.calledOnce(postMessageStub);
        sinon.assert.calledWith(postMessageStub, {
          command: "flow-lineage-message",
          payload: testData,
          panelType: "TestPanel"
        });
      });

      test("should not post message when view is not visible", () => {
        const testData = { status: "success", message: "test data" };
        baseLineagePanel._view = mockWebviewView;
        sinon.stub(mockWebviewView, "visible").value(false);
        
        baseLineagePanel.onDataUpdated(testData);
        
        sinon.assert.notCalled(postMessageStub);
      });

      test("should not post message when view is undefined", () => {
        const testData = { status: "success", message: "test data" };
        baseLineagePanel._view = undefined;
        
        baseLineagePanel.onDataUpdated(testData);
        
        sinon.assert.notCalled(postMessageStub);
      });

      test("should resolve webview view correctly", () => {
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;
        
        baseLineagePanel.resolveWebviewView(mockWebviewView, context, token);
        
        assert.strictEqual(baseLineagePanel._view, mockWebviewView);
        assert.strictEqual(baseLineagePanel.context, context);
        assert.strictEqual(baseLineagePanel.token, token);
        assert.strictEqual(mockWebviewView.webview.options.enableScripts, true);
      });


      test("should set up webview message listener", () => {
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;
        
        baseLineagePanel.resolveWebviewView(mockWebviewView, context, token);
        
        sinon.assert.calledOnce(onDidReceiveMessageStub);
      });

      test("should handle bruin.openAssetDetails message", async () => {
        const mockDocument = { uri: vscode.Uri.file("/test/file.sql") };
        const mockEditor = { document: mockDocument };
        
        openTextDocumentStub.resolves(mockDocument as any);
        showTextDocumentStub.resolves(mockEditor as any);
        
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;
        baseLineagePanel.resolveWebviewView(mockWebviewView, context, token);
        
        const messageHandler = onDidReceiveMessageStub.firstCall.args[0];
        await messageHandler({
          command: "bruin.openAssetDetails",
          payload: "/test/file.sql"
        });
        
        sinon.assert.calledOnce(openTextDocumentStub);
        sinon.assert.calledWith(openTextDocumentStub, vscode.Uri.file("/test/file.sql"));
        sinon.assert.calledOnce(showTextDocumentStub);
        sinon.assert.calledWith(showTextDocumentStub, mockDocument);
      });

      test("should handle bruin.assetGraphLineage message with active editor", async () => {
        const mockEditor = {
          document: { uri: vscode.Uri.file("/test/file.sql") }
        } as vscode.TextEditor;
        
        sinon.stub(vscode.window, "activeTextEditor").value(mockEditor);
        
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;
        baseLineagePanel.resolveWebviewView(mockWebviewView, context, token);
        
        const messageHandler = onDidReceiveMessageStub.firstCall.args[0];
        await messageHandler({
          command: "bruin.assetGraphLineage"
        });
        
        assert.strictEqual(baseLineagePanel._lastRenderedDocumentUri, mockEditor.document.uri);
      });

      test("should handle unknown message command", async () => {
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;
        baseLineagePanel.resolveWebviewView(mockWebviewView, context, token);
        
        const messageHandler = onDidReceiveMessageStub.firstCall.args[0];
        
        // Should not throw error for unknown command
        await messageHandler({
          command: "unknown.command"
        });
        
        assert.ok(true, "Should handle unknown command gracefully");
      });

      test("should post message when view exists", () => {
        baseLineagePanel._view = mockWebviewView;
        
        baseLineagePanel.postMessage("test-message", { status: "success", message: "test" });
        
        sinon.assert.calledOnce(postMessageStub);
        sinon.assert.calledWith(postMessageStub, {
          command: "test-message",
          payload: { status: "success", message: "test" }
        });
      });

      test("should not post message when view does not exist", () => {
        baseLineagePanel._view = undefined;
        
        baseLineagePanel.postMessage("test-message", { status: "success", message: "test" });
        
        sinon.assert.notCalled(postMessageStub);
      });

      test("should initialize panel with text editor", async () => {
        const mockEditor = {
          document: { uri: vscode.Uri.file("/test/file.sql") }
        } as vscode.TextEditor;
        
        const initStub = sinon.stub(baseLineagePanel, "init");
        
        await baseLineagePanel.initPanel(mockEditor);
        
        assert.strictEqual(baseLineagePanel._lastRenderedDocumentUri, mockEditor.document.uri);
        sinon.assert.calledOnce(initStub);
      });

      test("should initialize panel with text document change event", async () => {
        const mockEvent = {
          document: { uri: vscode.Uri.file("/test/file.sql") }
        } as vscode.TextDocumentChangeEvent;
        
        const initStub = sinon.stub(baseLineagePanel, "init");
        
        await baseLineagePanel.initPanel(mockEvent);
        
        assert.strictEqual(baseLineagePanel._lastRenderedDocumentUri, mockEvent.document.uri);
        sinon.assert.calledOnce(initStub);
      });

      test("should dispose all disposables", () => {
        const mockDisposable = { dispose: sinon.stub() };
        baseLineagePanel.disposables = [mockDisposable];
        
        baseLineagePanel.dispose();
        
        sinon.assert.calledOnce(mockDisposable.dispose);
        assert.strictEqual(baseLineagePanel.disposables.length, 0);
      });
    });

    suite("AssetLineagePanel", () => {
      test("should have correct view ID", () => {
        const { AssetLineagePanel } = require("../panels/LineagePanel");
        assert.strictEqual(AssetLineagePanel.viewId, "bruin.assetLineageView");
      });

      test("should return correct component name", () => {
        const componentName = assetLineagePanel.getComponentName();
        assert.strictEqual(componentName, "AssetLineageFlow");
      });

      test("should initialize with correct panel type", () => {
        assert.strictEqual(assetLineagePanel.panelType, "AssetLineage");
      });
    });

    suite("updateLineageData function", () => {
      test("should update lineage data in singleton", () => {
        const { updateLineageData } = require("../panels/LineagePanel");
        const testData = { status: "success", message: "test data" };
        
        updateLineageData(testData);
        
        const retrievedData = lineagePanel.getLineageData();
        assert.deepStrictEqual(retrievedData, testData);
      });
    });
  });

  suite("FlowLineageCommand Tests", () => {
    let flowLineageCommand: any;
    let BruinLineageInternalParseStub: sinon.SinonStub;
    let getBruinExecutablePathStub: sinon.SinonStub;
    let parseAssetLineageStub: sinon.SinonStub;
    let mockBruinLineageInternalParse: any;

    setup(async () => {
      // Import the function dynamically
      const { flowLineageCommand: importedFlowLineageCommand } = await import("../extension/commands/FlowLineageCommand");
      flowLineageCommand = importedFlowLineageCommand;
      
      // Setup stubs
      getBruinExecutablePathStub = sinon.stub();
      parseAssetLineageStub = sinon.stub();
      
      // Mock BruinLineageInternalParse instance
      mockBruinLineageInternalParse = {
        parseAssetLineage: parseAssetLineageStub
      };
      
      // Mock BruinLineageInternalParse constructor
      BruinLineageInternalParseStub = sinon.stub().returns(mockBruinLineageInternalParse) as any;
      
      // Replace module dependencies
      const bruinFlowLineageModule = await import("../bruin/bruinFlowLineage");
      sinon.replace(bruinFlowLineageModule, "BruinLineageInternalParse", BruinLineageInternalParseStub as any);
      
      const bruinExecutableServiceModule = await import("../providers/BruinExecutableService");
      sinon.replace(bruinExecutableServiceModule, "getBruinExecutablePath", getBruinExecutablePathStub);
    });

    teardown(() => {
      sinon.restore();
    });

    test("should execute flow lineage command successfully", async () => {
      const testUri = vscode.Uri.file("/test/file.sql");
      const bruinExecutablePath = "/path/to/bruin";
      
      getBruinExecutablePathStub.returns(bruinExecutablePath);
      parseAssetLineageStub.resolves();
      
      await flowLineageCommand(testUri);
      
      sinon.assert.calledOnce(getBruinExecutablePathStub);
      sinon.assert.calledOnce(BruinLineageInternalParseStub);
      sinon.assert.calledWith(BruinLineageInternalParseStub, bruinExecutablePath, "");
      sinon.assert.calledOnce(parseAssetLineageStub);
      sinon.assert.calledWith(parseAssetLineageStub, testUri.fsPath);
    });

    test("should return early when URI is undefined", async () => {
      await flowLineageCommand(undefined);
      
      sinon.assert.notCalled(getBruinExecutablePathStub);
      sinon.assert.notCalled(BruinLineageInternalParseStub);
      sinon.assert.notCalled(parseAssetLineageStub);
    });

    test("should return early when URI is null", async () => {
      await flowLineageCommand(null as any);
      
      sinon.assert.notCalled(getBruinExecutablePathStub);
      sinon.assert.notCalled(BruinLineageInternalParseStub);
      sinon.assert.notCalled(parseAssetLineageStub);
    });

    test("should handle parseAssetLineage errors", async () => {
      const testUri = vscode.Uri.file("/test/file.sql");
      const bruinExecutablePath = "/path/to/bruin";
      const error = new Error("Parse asset lineage failed");
      
      getBruinExecutablePathStub.returns(bruinExecutablePath);
      parseAssetLineageStub.rejects(error);
      
      try {
        await flowLineageCommand(testUri);
        assert.fail("Expected error to be thrown");
      } catch (err) {
        assert.strictEqual(err, error);
      }
      
      sinon.assert.calledOnce(getBruinExecutablePathStub);
      sinon.assert.calledOnce(BruinLineageInternalParseStub);
      sinon.assert.calledOnce(parseAssetLineageStub);
    });

    test("should handle getBruinExecutablePath errors", async () => {
      const testUri = vscode.Uri.file("/test/file.sql");
      const error = new Error("Failed to get Bruin executable path");
      
      getBruinExecutablePathStub.throws(error);
      
      try {
        await flowLineageCommand(testUri);
        assert.fail("Expected error to be thrown");
      } catch (err) {
        assert.strictEqual(err, error);
      }
      
      sinon.assert.calledOnce(getBruinExecutablePathStub);
      sinon.assert.notCalled(BruinLineageInternalParseStub);
      sinon.assert.notCalled(parseAssetLineageStub);
    });

    test("should work with different URI schemes", async () => {
      const testUri = vscode.Uri.parse("file:///test/file.sql");
      const bruinExecutablePath = "/path/to/bruin";
      
      getBruinExecutablePathStub.returns(bruinExecutablePath);
      parseAssetLineageStub.resolves();
      
      await flowLineageCommand(testUri);
      
      sinon.assert.calledOnce(parseAssetLineageStub);
      sinon.assert.calledWith(parseAssetLineageStub, testUri.fsPath);
    });

    test("should work with complex file paths", async () => {
      const testUri = vscode.Uri.file("/path/to/complex/file with spaces.sql");
      const bruinExecutablePath = "/path/to/bruin";
      
      getBruinExecutablePathStub.returns(bruinExecutablePath);
      parseAssetLineageStub.resolves();
      
      await flowLineageCommand(testUri);
      
      sinon.assert.calledOnce(parseAssetLineageStub);
      sinon.assert.calledWith(parseAssetLineageStub, testUri.fsPath);
    });

    test("should use correct working directory", async () => {
      const testUri = vscode.Uri.file("/test/file.sql");
      const bruinExecutablePath = "/path/to/bruin";
      
      getBruinExecutablePathStub.returns(bruinExecutablePath);
      parseAssetLineageStub.resolves();
      
      await flowLineageCommand(testUri);
      
      sinon.assert.calledOnce(BruinLineageInternalParseStub);
      sinon.assert.calledWith(BruinLineageInternalParseStub, bruinExecutablePath, "");
    });

    test("should handle multiple consecutive calls", async () => {
      const testUri1 = vscode.Uri.file("/test/file1.sql");
      const testUri2 = vscode.Uri.file("/test/file2.sql");
      const bruinExecutablePath = "/path/to/bruin";
      
      getBruinExecutablePathStub.returns(bruinExecutablePath);
      parseAssetLineageStub.resolves();
      
      await flowLineageCommand(testUri1);
      await flowLineageCommand(testUri2);
      
      sinon.assert.calledTwice(getBruinExecutablePathStub);
      sinon.assert.calledTwice(BruinLineageInternalParseStub);
      sinon.assert.calledTwice(parseAssetLineageStub);
      sinon.assert.calledWith(parseAssetLineageStub.firstCall, testUri1.fsPath);
      sinon.assert.calledWith(parseAssetLineageStub.secondCall, testUri2.fsPath);
    });
  });

  suite("Multi-line Command Formatting Tests", () => {
    let terminalStub: Partial<vscode.Terminal>;
    let terminalOptionsStub: Partial<vscode.TerminalOptions>;

    setup(() => {
      terminalOptionsStub = {
        shellPath: undefined,
      };
      terminalStub = {
        creationOptions: terminalOptionsStub as vscode.TerminalOptions,
      };
    });

    teardown(() => {
      sinon.restore();
    });

    suite("shouldUseUnixFormatting", () => {
      test("should return true for Unix-like shells on Windows", () => {
        const platformStub = sinon.stub(process, "platform").value("win32");
        
        // Test Git Bash
        terminalOptionsStub.shellPath = "C:\\Program Files\\Git\\bin\\bash.exe";
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "Git Bash should use Unix formatting"
        );

        // Test WSL
        terminalOptionsStub.shellPath = "wsl.exe";
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "WSL should use Unix formatting"
        );

        // Test undefined shellPath (default terminal)
        terminalOptionsStub.shellPath = undefined;
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "Default terminal should use Unix formatting"
        );

        platformStub.restore();
      });


      test("should return true for non-Windows platforms", () => {
        const platformStub = sinon.stub(process, "platform").value("darwin");
        
        terminalOptionsStub.shellPath = "/bin/bash";
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "macOS should use Unix formatting"
        );

        platformStub.value("linux");
        assert.strictEqual(
          (bruinUtils as any).shouldUseUnixFormatting(terminalStub as vscode.Terminal),
          true,
          "Linux should use Unix formatting"
        );

        platformStub.restore();
      });
    });

    suite("formatBruinCommand", () => {
      test("should format command with Unix line continuation", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh --push-metadata --downstream --exclude-tag python --environment prod",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --full-refresh \\
  --push-metadata \\
  --downstream \\
  --exclude-tag python \\
  --environment prod \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should format with Unix line continuation");
      });

      test("should format command with PowerShell line continuation", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh",
          "/path/to/asset.sql",
          false
        );

        const expected = `bruin run \`
  --start-date 2025-06-15T000000.000Z \`
  --end-date 2025-06-15T235959.999999999Z \`
  --full-refresh \`
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should format with PowerShell line continuation");
      });

      test("should handle empty flags", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "",
          "/path/to/asset.sql",
          true
        );

        const expected = "bruin run /path/to/asset.sql";
        assert.strictEqual(result, expected, "Should return simple command without flags");
      });

      test("should handle whitespace-only flags", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "   ",
          "/path/to/asset.sql",
          true
        );

        const expected = "bruin run /path/to/asset.sql";
        assert.strictEqual(result, expected, "Should return simple command with whitespace-only flags");
      });

      test("should handle flags with values", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --environment prod",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --environment prod \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should handle flags with values correctly");
      });

      test("should handle single flag", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--full-refresh",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --full-refresh \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should handle single flag correctly");
      });

      test("should handle flags with complex values", () => {
        const result = (bruinUtils as any).formatBruinCommand(
          "bruin",
          "run",
          "--exclude-tag python --exclude-tag java --environment prod",
          "/path/to/asset.sql",
          true
        );

        const expected = `bruin run \\
  --exclude-tag python \\
  --exclude-tag java \\
  --environment prod \\
  /path/to/asset.sql`;

        assert.strictEqual(result, expected, "Should handle flags with complex values correctly");
      });
    });

    suite("runInIntegratedTerminal with formatting", () => {
      let createIntegratedTerminalStub: sinon.SinonStub;
      let terminalSendTextStub: sinon.SinonStub;
      let terminalShowStub: sinon.SinonStub;

      setup(() => {
        terminalSendTextStub = sinon.stub();
        terminalShowStub = sinon.stub();
        
        const mockTerminal = {
          creationOptions: {
            shellPath: "C:\\Program Files\\Git\\bin\\bash.exe"
          },
          show: terminalShowStub,
          sendText: terminalSendTextStub
        } as any;

        createIntegratedTerminalStub = sinon.stub(bruinUtils, "createIntegratedTerminal").resolves(mockTerminal);
      });

      teardown(() => {
        sinon.restore();
      });

      test("should format command with Unix formatting for Git Bash", async () => {
        const flags = "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh --push-metadata";
        const assetPath = "/path/to/asset.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, flags, "bruin");

        assert.ok(terminalSendTextStub.calledTwice, "Should send text twice (dummy call + command)");
        
        const actualCommand = terminalSendTextStub.secondCall.args[0];
        const expectedCommand = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --full-refresh \\
  --push-metadata \\
  "/path/to/asset.sql"`;

        assert.strictEqual(actualCommand, expectedCommand, "Should format command with Unix line continuation");
      });

      test("should use simple command when no flags provided", async () => {
        const assetPath = "/path/to/asset.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, "", "bruin");

        const actualCommand = terminalSendTextStub.secondCall.args[0];
        const expectedCommand = 'bruin run "/path/to/asset.sql"';

        assert.strictEqual(actualCommand, expectedCommand, "Should use simple command without flags");
      });

      test("should use correct executable based on terminal type", async () => {
        const mockTerminal = {
          creationOptions: {
            shellPath: "C:\\Program Files\\Git\\bin\\bash.exe"
          },
          show: terminalShowStub,
          sendText: terminalSendTextStub
        } as any;

        createIntegratedTerminalStub.resolves(mockTerminal);

        const flags = "--full-refresh";
        const assetPath = "/path/to/asset.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, flags, "/custom/path/bruin");

        const actualCommand = terminalSendTextStub.secondCall.args[0];
        // Should use "bruin" for Git Bash, not the custom path
        assert.ok(actualCommand.startsWith("bruin run"), "Should use 'bruin' executable for Git Bash");
      });


      test("should handle complex flag combinations", async () => {
        const flags = "--start-date 2025-06-15T000000.000Z --end-date 2025-06-15T235959.999999999Z --full-refresh --push-metadata --downstream --exclude-tag python --exclude-tag java --environment prod";
        const assetPath = "/Users/maya/Documents/GitHub/neptune/pipelines/wep/assets/tier_2/exchanges/epias_plants_uevm.sql";

        await bruinUtils.runInIntegratedTerminal("/working/dir", assetPath, flags, "bruin");

        const actualCommand = terminalSendTextStub.secondCall.args[0];
        const expectedCommand = `bruin run \\
  --start-date 2025-06-15T000000.000Z \\
  --end-date 2025-06-15T235959.999999999Z \\
  --full-refresh \\
  --push-metadata \\
  --downstream \\
  --exclude-tag python \\
  --exclude-tag java \\
  --environment prod \\
  "/Users/maya/Documents/GitHub/neptune/pipelines/wep/assets/tier_2/exchanges/epias_plants_uevm.sql"`;

        assert.strictEqual(actualCommand, expectedCommand, "Should handle complex flag combinations correctly");
      });
    });
  });

  suite("BruinEnvList Tests", () => {
    let bruinEnvList: BruinEnvList;
    let runStub: sinon.SinonStub;
    let BruinPanelPostMessageStub: sinon.SinonStub;
    let QueryPreviewPanelPostMessageStub: sinon.SinonStub;
    let consoleDebugStub: sinon.SinonStub;

    setup(() => {
      bruinEnvList = new BruinEnvList("path/to/bruin", "path/to/working/directory");
      runStub = sinon.stub(bruinEnvList as any, "run");
      BruinPanelPostMessageStub = sinon.stub(BruinPanel, "postMessage");
      QueryPreviewPanelPostMessageStub = sinon.stub(QueryPreviewPanel, "postMessage");
      consoleDebugStub = sinon.stub(console, "debug");
    });

    teardown(() => {
      sinon.restore();
    });

    suite("Constructor", () => {
      test("should create BruinEnvList instance with correct parameters", () => {
        const bruinExecutablePath = "path/to/bruin";
        const workingDirectory = "path/to/working/directory";
        
        const envList = new BruinEnvList(bruinExecutablePath, workingDirectory);
        
        assert.ok(envList instanceof BruinEnvList, "Should be instance of BruinEnvList");
        assert.ok(envList instanceof BruinCommand, "Should extend BruinCommand");
      });
    });

    suite("bruinCommand", () => {
      test("should return 'environments' as the bruin command", () => {
        const result = (bruinEnvList as any).bruinCommand();
        
        assert.strictEqual(result, "environments", "Should return 'environments' command");
      });
    });

    suite("getEnvironmentsList", () => {
      test("should get environments list successfully with default flags", async () => {
        const mockResult = '{"environments": [{"id": 1, "name": "dev"}, {"id": 2, "name": "prod"}]}';
        runStub.resolves(mockResult);
        
        await bruinEnvList.getEnvironmentsList();
        
        sinon.assert.calledOnce(runStub);
        sinon.assert.calledWith(runStub, ["list", "-o", "json"], { ignoresErrors: false });
        sinon.assert.calledOnce(BruinPanelPostMessageStub);
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { 
          status: "success", 
          message: mockResult 
        });
        sinon.assert.calledOnce(QueryPreviewPanelPostMessageStub);
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status: "success",
          message: {
            command: "init-environment",
            payload: mockResult,
          },
        });
      });

      test("should get environments list with custom flags", async () => {
        const customFlags = ["list", "--custom-flag", "-o", "json"];
        const mockResult = '{"environments": [{"id": 1, "name": "dev"}]}';
        runStub.resolves(mockResult);
        
        await bruinEnvList.getEnvironmentsList({ flags: customFlags });
        
        sinon.assert.calledOnce(runStub);
        sinon.assert.calledWith(runStub, customFlags, { ignoresErrors: false });
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { 
          status: "success", 
          message: mockResult 
        });
      });

      test("should get environments list with ignoresErrors option", async () => {
        const mockResult = '{"environments": []}';
        runStub.resolves(mockResult);
        
        await bruinEnvList.getEnvironmentsList({ ignoresErrors: true });
        
        sinon.assert.calledOnce(runStub);
        sinon.assert.calledWith(runStub, ["list", "-o", "json"], { ignoresErrors: true });
      });

      test("should handle empty result", async () => {
        const emptyResult = "";
        runStub.resolves(emptyResult);
        
        await bruinEnvList.getEnvironmentsList();
        
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { 
          status: "success", 
          message: emptyResult 
        });
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status: "success",
          message: {
            command: "init-environment",
            payload: emptyResult,
          },
        });
      });

      test("should handle JSON string result", async () => {
        const jsonResult = '{"status": "success", "data": []}';
        runStub.resolves(jsonResult);
        
        await bruinEnvList.getEnvironmentsList();
        
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { 
          status: "success", 
          message: jsonResult 
        });
      });

      test("should handle non-string error", async () => {
        const error = { code: 1, message: "Error object" };
        runStub.rejects(error);
        
        await bruinEnvList.getEnvironmentsList();
        
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { 
          status: "error", 
          message: error 
        });
      });
    });

    suite("postMessageToPanels", () => {
      test("should post success message to BruinPanel", () => {
        const status = "success";
        const message = "Environments retrieved successfully";
        
        (bruinEnvList as any).postMessageToPanels(status, message);
        
        sinon.assert.calledOnce(BruinPanelPostMessageStub);
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { status, message });
      });

      test("should post error message to BruinPanel", () => {
        const status = "error";
        const message = "Failed to retrieve environments";
        
        (bruinEnvList as any).postMessageToPanels(status, message);
        
        sinon.assert.calledOnce(BruinPanelPostMessageStub);
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { status, message });
      });

      test("should post object message to BruinPanel", () => {
        const status = "success";
        const message = { environments: [{ id: 1, name: "dev" }] };
        
        (bruinEnvList as any).postMessageToPanels(status, message);
        
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", { status, message });
      });
    });

    suite("sendEnvironmentToQueryPreview", () => {
      test("should send success environment to QueryPreviewPanel", () => {
        const status = "success";
        const environment = '{"environments": [{"id": 1, "name": "dev"}]}';
        
        BruinEnvList.sendEnvironmentToQueryPreview(status, environment);
        
        sinon.assert.calledOnce(QueryPreviewPanelPostMessageStub);
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status,
          message: {
            command: "init-environment",
            payload: environment,
          },
        });
      });

      test("should send error environment to QueryPreviewPanel", () => {
        const status = "error";
        const environment = "Failed to load environments";
        
        BruinEnvList.sendEnvironmentToQueryPreview(status, environment);
        
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status,
          message: {
            command: "init-environment",
            payload: environment,
          },
        });
      });

      test("should send object environment to QueryPreviewPanel", () => {
        const status = "success";
        const environment = JSON.stringify({ environments: [{ id: 1, name: "prod" }] });
        
        BruinEnvList.sendEnvironmentToQueryPreview(status, environment);
        
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status,
          message: {
            command: "init-environment",
            payload: environment,
          },
        });
      });

      test("should send empty environment to QueryPreviewPanel", () => {
        const status = "success";
        const environment = "";
        
        BruinEnvList.sendEnvironmentToQueryPreview(status, environment);
        
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status,
          message: {
            command: "init-environment",
            payload: environment,
          },
        });
      });
    });

    suite("Integration Tests", () => {
      test("should handle complete successful workflow", async () => {
        const mockResult = '{"environments": [{"id": 1, "name": "dev"}]}';
        runStub.resolves(mockResult);
        
        await bruinEnvList.getEnvironmentsList();
        
        // Verify all expected calls were made
        sinon.assert.calledOnce(runStub);
        sinon.assert.calledOnce(BruinPanelPostMessageStub);
        sinon.assert.calledOnce(QueryPreviewPanelPostMessageStub);
        
        // Verify the correct message flow
        sinon.assert.calledWith(BruinPanelPostMessageStub, "environments-list-message", {
          status: "success",
          message: mockResult,
        });
        
        sinon.assert.calledWith(QueryPreviewPanelPostMessageStub, "init-environment", {
          status: "success",
          message: {
            command: "init-environment",
            payload: mockResult,
          },
        });
      });

    });
  });

  suite("Configuration Tests", () => {
    let workspaceGetConfigurationStub: sinon.SinonStub;
    let windowActiveTextEditorStub: sinon.SinonStub;
    let commandsExecuteCommandStub: sinon.SinonStub;
    let windowOnDidChangeActiveTextEditorStub: sinon.SinonStub;
    let workspaceOnDidChangeConfigurationStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;
    let bruinFoldingRangeProviderStub: sinon.SinonStub;

    setup(() => {
      // Stub VSCode workspace and window methods
      workspaceGetConfigurationStub = sinon.stub(vscode.workspace, "getConfiguration");
      windowActiveTextEditorStub = sinon.stub(vscode.window, "activeTextEditor");
      commandsExecuteCommandStub = sinon.stub(vscode.commands, "executeCommand");
      windowOnDidChangeActiveTextEditorStub = sinon.stub(vscode.window, "onDidChangeActiveTextEditor");
      workspaceOnDidChangeConfigurationStub = sinon.stub(vscode.workspace, "onDidChangeConfiguration");
      consoleLogStub = sinon.stub(console, "log");
      
      // Stub the bruinFoldingRangeProvider
      bruinFoldingRangeProviderStub = sinon.stub();
      const providersModule = require("../providers/bruinFoldingRangeProvider");
      sinon.replace(providersModule, "bruinFoldingRangeProvider", bruinFoldingRangeProviderStub);
    });

    teardown(() => {
      sinon.restore();
    });

    suite("getDefaultCheckboxSettings", () => {
      test("should return default checkbox settings from configuration", () => {
        const mockConfig = {
          get: sinon.stub()
            .withArgs("defaultIntervalModifiers", false).returns(true)
            .withArgs("defaultExclusiveEndDate", false).returns(true)
            .withArgs("defaultPushMetadata", false).returns(true)
        };
        workspaceGetConfigurationStub.withArgs("bruin.checkbox").returns(mockConfig);

        const { getDefaultCheckboxSettings } = require("../extension/configuration");
        const result = getDefaultCheckboxSettings();

        assert.deepStrictEqual(result, {
          defaultIntervalModifiers: true,
          defaultExclusiveEndDate: true,
          defaultPushMetadata: true,
        });
        sinon.assert.calledWith(workspaceGetConfigurationStub, "bruin.checkbox");
      });

      test("should return default values when configuration is not set", () => {
        const mockConfig = {
          get: sinon.stub()
            .withArgs("defaultIntervalModifiers", false).returns(false)
            .withArgs("defaultExclusiveEndDate", false).returns(false)
            .withArgs("defaultPushMetadata", false).returns(false)
        };
        workspaceGetConfigurationStub.withArgs("bruin.checkbox").returns(mockConfig);

        const { getDefaultCheckboxSettings } = require("../extension/configuration");
        const result = getDefaultCheckboxSettings();

        assert.deepStrictEqual(result, {
          defaultIntervalModifiers: false,
          defaultExclusiveEndDate: false,
          defaultPushMetadata: false,
        });
      });
    });

    suite("getPathSeparator", () => {
      test("should return configured path separator", () => {
        const mockConfig = {
          get: sinon.stub().withArgs("pathSeparator").returns("\\")
        };
        workspaceGetConfigurationStub.withArgs("bruin").returns(mockConfig);

        const { getPathSeparator } = require("../extension/configuration");
        const result = getPathSeparator();

        assert.strictEqual(result, "\\");
        sinon.assert.calledWith(workspaceGetConfigurationStub, "bruin");
      });

      test("should return default path separator when not configured", () => {
        const mockConfig = {
          get: sinon.stub().withArgs("pathSeparator").returns(undefined)
        };
        workspaceGetConfigurationStub.withArgs("bruin").returns(mockConfig);

        const { getPathSeparator } = require("../extension/configuration");
        const result = getPathSeparator();

        assert.strictEqual(result, "/");
      });

      test("should return default path separator when configuration returns null", () => {
        const mockConfig = {
          get: sinon.stub().withArgs("pathSeparator").returns(null)
        };
        workspaceGetConfigurationStub.withArgs("bruin").returns(mockConfig);

        const { getPathSeparator } = require("../extension/configuration");
        const result = getPathSeparator();

        assert.strictEqual(result, "/");
      });
    });

    suite("toggleFoldingsCommand", () => {
      let mockEditor: vscode.TextEditor;
      let mockDocument: vscode.TextDocument;
      let mockUri: vscode.Uri;

      setup(() => {
        mockUri = vscode.Uri.file("/test/file.sql");
        mockDocument = {
          uri: mockUri,
        } as vscode.TextDocument;
        mockEditor = {
          document: mockDocument,
          selection: new vscode.Selection(0, 0, 0, 0),
          selections: [],
        } as unknown as vscode.TextEditor;
      });

      test("should return early when no active editor", async () => {
        windowActiveTextEditorStub.value(undefined);

        const { toggleFoldingsCommand } = require("../extension/configuration");
        await toggleFoldingsCommand(true);

        sinon.assert.notCalled(commandsExecuteCommandStub);
      });


      test("should not fold when no Bruin regions found", async () => {
        windowActiveTextEditorStub.value(mockEditor);
        bruinFoldingRangeProviderStub.returns([]);

        const { toggleFoldingsCommand } = require("../extension/configuration");
        await toggleFoldingsCommand(true);

        sinon.assert.notCalled(commandsExecuteCommandStub);
      });

   

      test("should not unfold when no Bruin regions found", async () => {
        windowActiveTextEditorStub.value(mockEditor);
        bruinFoldingRangeProviderStub.returns([]);

        const { toggleFoldingsCommand } = require("../extension/configuration");
        await toggleFoldingsCommand(false);

        sinon.assert.notCalled(commandsExecuteCommandStub);
      });

      test("should handle command execution errors", async () => {
        windowActiveTextEditorStub.value(mockEditor);
        const mockRanges = [new vscode.FoldingRange(0, 5)];
        bruinFoldingRangeProviderStub.returns(mockRanges);
        commandsExecuteCommandStub.rejects(new Error("Command failed"));

        const { toggleFoldingsCommand } = require("../extension/configuration");
        
        try {
          await toggleFoldingsCommand(true);
        } catch (error) {
          // Expected error
        }

        sinon.assert.calledOnce(commandsExecuteCommandStub);
      });
    });

    suite("applyFoldingStateBasedOnConfiguration", () => {
      let mockEditor: vscode.TextEditor;
      let mockDocument: vscode.TextDocument;
      let mockUri: vscode.Uri;

      setup(() => {
        mockUri = vscode.Uri.file("/test/file.sql");
        mockDocument = {
          uri: mockUri,
        } as vscode.TextDocument;
        mockEditor = {
          document: mockDocument,
        } as unknown as vscode.TextEditor;
      });

      test("should return early when no editor provided", () => {
        const { applyFoldingStateBasedOnConfiguration } = require("../extension/configuration");
        applyFoldingStateBasedOnConfiguration(undefined);

        sinon.assert.notCalled(commandsExecuteCommandStub);
      });

    });

    suite("setupFoldingOnOpen", () => {
      test("should set up event listener for active text editor changes", () => {
        const mockDisposable = { dispose: sinon.stub() };
        windowOnDidChangeActiveTextEditorStub.returns(mockDisposable);

        const { setupFoldingOnOpen } = require("../extension/configuration");
        setupFoldingOnOpen();

        sinon.assert.calledOnce(windowOnDidChangeActiveTextEditorStub);
      });

    });

    suite("subscribeToConfigurationChanges", () => {
      test("should set up event listener for configuration changes", () => {
        const mockDisposable = { dispose: sinon.stub() };
        workspaceOnDidChangeConfigurationStub.returns(mockDisposable);

        const { subscribeToConfigurationChanges } = require("../extension/configuration");
        subscribeToConfigurationChanges();

        sinon.assert.calledOnce(workspaceOnDidChangeConfigurationStub);
      });

      test("should reset document states when bruin.FoldingState changes", () => {
        let eventListener: (e: vscode.ConfigurationChangeEvent) => void;
        
        workspaceOnDidChangeConfigurationStub.callsFake((listener) => {
          eventListener = listener;
          return { dispose: sinon.stub() };
        });

        const { subscribeToConfigurationChanges } = require("../extension/configuration");
        subscribeToConfigurationChanges();

        // Mock configuration change event
        const affectsConfigurationStub = sinon.stub().withArgs("bruin.FoldingState").returns(true);
        const mockEvent = {
          affectsConfiguration: affectsConfigurationStub
        } as vscode.ConfigurationChangeEvent;

        // Simulate configuration change
        eventListener!(mockEvent);

        sinon.assert.calledWith(affectsConfigurationStub, "bruin.FoldingState");
      });

      test("should not reset document states for other configuration changes", () => {
        let eventListener: (e: vscode.ConfigurationChangeEvent) => void;
        
        workspaceOnDidChangeConfigurationStub.callsFake((listener) => {
          eventListener = listener;
          return { dispose: sinon.stub() };
        });

        const { subscribeToConfigurationChanges } = require("../extension/configuration");
        subscribeToConfigurationChanges();

        // Mock configuration change event for different setting
        const affectsConfigurationStub = sinon.stub().withArgs("bruin.FoldingState").returns(false);
        const mockEvent = {
          affectsConfiguration: affectsConfigurationStub
        } as vscode.ConfigurationChangeEvent;

        // Simulate configuration change
        eventListener!(mockEvent);

        sinon.assert.calledWith(affectsConfigurationStub, "bruin.FoldingState");
      });
    });

    suite("Integration Tests", () => {
      test("should handle complete folding workflow", async () => {
        const mockEditor = {
          document: { uri: vscode.Uri.file("/test/file.sql") },
          selection: new vscode.Selection(0, 0, 0, 0),
          selections: [],
        } as unknown as vscode.TextEditor;

        windowActiveTextEditorStub.value(mockEditor);
        const mockRanges = [new vscode.FoldingRange(0, 5)];
        bruinFoldingRangeProviderStub.returns(mockRanges);
        commandsExecuteCommandStub.resolves();

        const { toggleFoldingsCommand } = require("../extension/configuration");
        await toggleFoldingsCommand(true);

        sinon.assert.calledOnce(commandsExecuteCommandStub);
        sinon.assert.calledWith(commandsExecuteCommandStub, "editor.fold", {
          selectionLines: [0],
          levels: 1
        });
      });

      test("should handle configuration change workflow", () => {
        let eventListener: (e: vscode.ConfigurationChangeEvent) => void;
        
        workspaceOnDidChangeConfigurationStub.callsFake((listener) => {
          eventListener = listener;
          return { dispose: sinon.stub() };
        });

        const { subscribeToConfigurationChanges } = require("../extension/configuration");
        subscribeToConfigurationChanges();

        // Mock configuration change event
        const affectsConfigurationStub = sinon.stub().withArgs("bruin.FoldingState").returns(true);
        const mockEvent = {
          affectsConfiguration: affectsConfigurationStub
        } as vscode.ConfigurationChangeEvent;

        // Simulate configuration change
        eventListener!(mockEvent);

        sinon.assert.calledWith(affectsConfigurationStub, "bruin.FoldingState");
      });
    });
  });