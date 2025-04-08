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
import { getDefaultBruinExecutablePath, getPathSeparator } from "../extension/configuration";
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
import { parseAssetCommand, patchAssetCommand } from "../extension/commands/parseAssetCommand";
import { getEnvListCommand } from "../extension/commands/getEnvListCommand";
import { lineageCommand } from "../extension/commands/lineageCommand";
import { BruinInternalParse } from "../bruin/bruinInternalParse";
import { BruinEnvList } from "../bruin/bruinSelectEnv";
import { activate } from "../extension/extension";
import { checkBruinCliVersion, installOrUpdateCli } from "../extension/commands/updateBruinCLI";
import { getLanguageDelimiters } from "../utilities/delimiters";
import { bruinDelimiterRegex } from "../constants";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { flowLineageCommand } from "../extension/commands/FlowLineageCommand";
import { BruinLineageInternalParse } from "../bruin/bruinFlowLineage";
import { BruinCommandOptions } from "../types";
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
  let execSyncStub: sinon.SinonStub;

  setup(() => {
    execSyncStub = sinon.stub(require("child_process"), "execSync");
  });

  teardown(() => {
    sinon.restore();
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
    test("getBruinVersion returns valid version data", () => {
      // Set a valid return value for execSync
      execSyncStub.returns(Buffer.from('{"version": "v1.0.0", "latest": "v1.1.0"}'));
      
      const versionInfo = getBruinVersion();
      assert.strictEqual(versionInfo?.version, "v1.0.0");
      assert.strictEqual(versionInfo?.latest, "v1.1.0");
    });
    test("getBruinVersion returns null when execSync fails", () => {
      execSyncStub.throws(new Error("Failed to get Bruin version"));
      const versionInfo = getBruinVersion();
      assert.strictEqual(versionInfo, null);
    });
    
  });
  suite("Check CLI Version tests", () => {
    test("should return 'outdated' when current version is less than latest", async () => {
      execSyncStub.returns(Buffer.from('{"version": "v1.0.0", "latest": "v1.1.0"}'));
      const result = await checkCliVersion();
      assert.strictEqual(result.status, "outdated");
      assert.strictEqual(result.current, "v1.0.0");
      assert.strictEqual(result.latest, "v1.1.0");
    });
  
    test("should return 'current' when current version is equal to latest", async () => {
      execSyncStub.returns(Buffer.from('{"version": "v1.1.0", "latest": "v1.1.0"}'));
      const result = await checkCliVersion();
      assert.strictEqual(result.status, "current");
      assert.strictEqual(result.current, "v1.1.0");
      assert.strictEqual(result.latest, "v1.1.0");
    });
  
    test("should return 'error' when getBruinVersion returns null", async () => {
      execSyncStub.throws(new Error("Failed to get Bruin version"));
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
    sinon.stub(configuration, "getDefaultBruinExecutablePath").returns("path/to/executable");
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
  let getDefaultBruinExecutablePathStub: sinon.SinonStub;
  let bruinWorkspaceDirectoryStub: sinon.SinonStub;
  let getConnectionsStub: sinon.SinonStub;
  let getConnectionsListFromSchemaStub: sinon.SinonStub;
  let deleteConnectionStub: sinon.SinonStub;
  let createConnectionStub: sinon.SinonStub;

  setup(() => {
    getDefaultBruinExecutablePathStub = sinon
      .stub(configuration, "getDefaultBruinExecutablePath")
      .returns("path/to/executable");
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
      sinon.assert.calledOnceWithExactly(getDefaultBruinExecutablePathStub);
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
      sinon.assert.calledOnceWithExactly(getDefaultBruinExecutablePathStub);
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
      sinon.assert.calledOnceWithExactly(getDefaultBruinExecutablePathStub);
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
      sinon.assert.calledOnceWithExactly(getDefaultBruinExecutablePathStub);
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
  let getDefaultBruinExecutablePathStub: sinon.SinonStub;
  let bruinWorkspaceDirectoryStub: sinon.SinonStub;
  let displayLineageStub: sinon.SinonStub;

  setup(() => {
    // Stub the configuration method
    getDefaultBruinExecutablePathStub = sinon
      .stub(configuration, "getDefaultBruinExecutablePath")
      .returns("mock-executable-path");

    // Stub the bruinWorkspaceDirectory method
    bruinWorkspaceDirectoryStub = sinon
      .stub(bruinUtils, "bruinWorkspaceDirectory")
      .resolves("mock-workspace-directory");

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
suite("BruinLineageInternalParse Tests", () => {
  let bruinLineageInternalParse: BruinLineageInternalParse;
  let runStub: sinon.SinonStub;
  let postMessageStub: sinon.SinonStub;
  let getDefaultBruinExecutablePathStub: sinon.SinonStub;
  let bruinWorkspaceDirectoryStub: sinon.SinonStub;
  let getCurrentPipelinePathStub: sinon.SinonStub;

  setup(() => {
    const mockBruinExecutable = "mock-executable-path";
    const mockWorkingDirectory = "mock-working-directory";

    // Instantiate BruinLineageInternalParse with required parameters
    bruinLineageInternalParse = new BruinLineageInternalParse(
      mockBruinExecutable,
      mockWorkingDirectory
    );
    runStub = sinon.stub(bruinLineageInternalParse as any, "run");
    postMessageStub = sinon.stub(LineagePanel, "postMessage");
    getCurrentPipelinePathStub = sinon
      .stub(require("../bruin/bruinUtils"), "getCurrentPipelinePath")
      .resolves("mock-pipeline-path");
  });

  teardown(() => {
    sinon.restore();
  });

  test("parseAssetLineage resolves with success message on successful run", async () => {
    const filePath = "path/to/asset";
    const flags = ["parse-pipeline"];
    const mockResult = JSON.stringify({
      assets: [{ id: "asset-id", name: "Asset Name", definition_file: { path: filePath } }],
    });

    runStub.resolves(mockResult);

    await bruinLineageInternalParse.parseAssetLineage(filePath, { flags });

    sinon.assert.calledWith(postMessageStub, "flow-lineage-message", {
      status: "success",
      message: {
        id: "asset-id",
        name: "Asset Name",
        pipeline: mockResult,
      },
    });
  });

  test("parseAssetLineage throws error when asset is not found", async () => {
    const filePath = "path/to/asset";
    const flags = ["parse-pipeline"];
    const mockResult = JSON.stringify({
      assets: [], // No assets found
    });

    runStub.resolves(mockResult);

    try {
      await bruinLineageInternalParse.parseAssetLineage(filePath, { flags });
    } catch (error) {
      sinon.assert.match((error as Error).message, "Asset not found in pipeline data");
    }
  });

  test("parseAssetLineage handles error from run method", async () => {
    const filePath = "path/to/asset";
    const flags = ["parse-pipeline"];
    const errorMessage = "Some error occurred";

    runStub.rejects(errorMessage);

    await bruinLineageInternalParse.parseAssetLineage(filePath, { flags });

    sinon.assert.calledWith(postMessageStub, "flow-lineage-message", {
      status: "error",
      message: errorMessage,
    });
  });

  test("parseAssetLineage handles specific error message for Bruin CLI", async () => {
    const filePath = "path/to/asset";
    const flags = ["parse-pipeline"];
    const errorMessage = "No help topic for this command";

    runStub.rejects(errorMessage);

    await bruinLineageInternalParse.parseAssetLineage(filePath, { flags });

    sinon.assert.calledWith(postMessageStub, "flow-lineage-message", {
      status: "error",
      message:
        "Bruin CLI is not installed or is outdated. Please install or update Bruin CLI to use this feature.",
    });
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
      assert.ok(bruinWorkspaceDirectoryStub.calledOnce, "Workspace directory should be resolved");
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

suite("LineagePanel Tests", () => {
  let windowOnDidChangeActiveTextEditorStub: sinon.SinonStub;
  let windowActiveTextEditorStub: sinon.SinonStub;
  let flowLineageCommandStub: sinon.SinonStub;
  let mockExtensionUri: vscode.Uri;
  let mockDocumentUri: vscode.Uri;
  let windowCreateWebviewPanelStub: sinon.SinonStub;
  setup(() => {
    // Create mock URIs
    mockExtensionUri = vscode.Uri.file("/mock/extension/path");
    mockDocumentUri = vscode.Uri.file("/mock/document.sql");
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
    // Stub VSCode window methods
    windowActiveTextEditorStub = sinon.stub(vscode.window, "activeTextEditor").value({
      document: {
        uri: mockDocumentUri,
        fsPath: mockDocumentUri.fsPath,
      },
    });

    // Stub window events and lineage command
    windowOnDidChangeActiveTextEditorStub = sinon
      .stub(vscode.window, "onDidChangeActiveTextEditor")
      .returns({
        dispose: sinon.stub(),
      });

    flowLineageCommandStub = sinon.stub().resolves();
  });

  teardown(() => {
    sinon.restore();
    // Reset the static view
    (LineagePanel as any)._view = undefined;
  });

  suite("Initialization Tests", () => {
    test("creates LineagePanel instance", () => {
      const lineagePanel = new LineagePanel(mockExtensionUri);
      assert.ok(lineagePanel, "LineagePanel should be created");
    });

    test("sets up event listeners on construction", () => {
      const lineagePanel = new LineagePanel(mockExtensionUri);
      assert.ok(
        windowOnDidChangeActiveTextEditorStub.calledOnce,
        "onDidChangeActiveTextEditor listener should be set up"
      );
    });
  });

  suite("Webview Resolution Tests", () => {
    let lineagePanel: LineagePanel;
    let webviewView: vscode.WebviewView = {
      webview: {
        postMessage: sinon.stub(),
        onDidReceiveMessage: sinon.stub(),
        html: "",
        cspSource: "default-src",
        asWebviewUri: sinon.stub(),
        options: {
          enableScripts: true,
        },
      },
    } as any;
    let webviewStub: sinon.SinonStubbedInstance<vscode.Webview>;

    setup(() => {
      lineagePanel = new LineagePanel(mockExtensionUri);

      // Create webview stubs
    });

    test("resolves webview view with correct options", () => {
      const context = {} as vscode.WebviewViewResolveContext;
      const token = {} as vscode.CancellationToken;

      lineagePanel.resolveWebviewView(webviewView, context, token);

      assert.strictEqual(
        webviewView.webview.options.enableScripts,
        true,
        "Scripts should be enabled"
      );
    });
  });

  suite("Disposal Tests", () => {
    test("properly disposes of resources", () => {
      const lineagePanel = new LineagePanel(mockExtensionUri);
      const disposeSpy = sinon.spy();

      (lineagePanel as any).disposables = [{ dispose: disposeSpy }, { dispose: disposeSpy }];

      lineagePanel.dispose();

      assert.strictEqual(disposeSpy.callCount, 2, "All disposable resources should be disposed");
    });
  });

  suite("Static Method Tests", () => {
    test("posts message when view exists", () => {
      // Mock the static _view
      (LineagePanel as any)._view = {
        webview: {
          postMessage: sinon.stub(),
        },
      };

      LineagePanel.postMessage("test", "data");

      const view = (LineagePanel as any)._view;
      assert.ok(
        view.webview.postMessage.calledWith({ command: "test", payload: "data" }),
        "Should post message to webview"
      );
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
  let setQueryStub: sinon.SinonStub;

  setup(() => {
    getWorkspaceFolderStub = sinon.stub(vscode.workspace, "getWorkspaceFolder");
    getExecutablePathStub = sinon.stub(configuration, "getDefaultBruinExecutablePath").returns("bruin");
    bruinDirStub = sinon.stub(bruinUtils, "bruinWorkspaceDirectory").resolves("/mocked/workspace");
    getOutputStub = sinon.stub(BruinQueryOutput.prototype, "getOutput").resolves();
    showErrorStub = sinon.stub(vscode.window, "showErrorMessage");
    setQueryStub = sinon.stub(QueryPreviewPanel, "setLastExecutedQuery");
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

    await getQueryOutput("dev", "100", uri);

    assert.strictEqual(showErrorStub.calledWith("No workspace folder found"), true);
  });

  test("should store query and call getOutput with selected query", async () => {
    const uri = vscode.Uri.file("/some/file.sql");
    const fakeQuery = "SELECT * FROM table";
    const fakeDoc = {
      uri,
      getText: () => fakeQuery,
    } as unknown as vscode.TextDocument;

    const fakeEditor = {
      document: fakeDoc,
      selection: {
        isEmpty: false,
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 10),
      },
    } as vscode.TextEditor;

    sinon.stub(vscode.window, "activeTextEditor").value(fakeEditor);
    getWorkspaceFolderStub.returns({ uri: { fsPath: "/mocked/workspace" } });

    await getQueryOutput("dev", "10", uri);

    assert.strictEqual(setQueryStub.calledWith(fakeQuery), true);
    assert.strictEqual(getOutputStub.calledWith("dev", uri.fsPath, "10", { query: fakeQuery }), true);
  });

  test("should send empty query when selection is empty", async () => {
    const uri = vscode.Uri.file("/no/selection.sql");
    const fakeDoc = {
      uri,
      getText: () => "ignored", // should not be used when selection is empty
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

    await getQueryOutput("dev", "50", uri);

    assert.strictEqual(setQueryStub.calledWith(""), true);
    assert.strictEqual(getOutputStub.calledWith("dev", uri.fsPath, "50", { query: "" }), true);
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

    // Mock the run method to simulate older CLI behavior
    bruinQueryOutput.run = async (flags: string[]) => {
      return "Incorrect Usage: flag provided but not defined: -env";
    };

    await bruinQueryOutput.getOutput(environment, asset, limit);

    // Verify that postMessage was called with the correct error message
    sinon.assert.calledWith(queryPreviewPanelStub, "query-output-message", {
      status: "error",
      message: "This feature requires the latest Bruin CLI version. Please update your CLI.",
    });
  });

  test("should handle errors during command execution", async () => {
    const environment = "dev";
    const asset = "exampleAsset";
    const limit = "10";

    // Mock the run method to simulate an error
    bruinQueryOutput.run = async () => {
      throw new Error("Mock error");
    };

    await bruinQueryOutput.getOutput(environment, asset, limit);

    sinon.assert.calledWith(queryPreviewPanelStub, "query-output-message", {
      status: "error",
      message: "Mock error",
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

    await bruinQueryExport.exportResults(asset, { flags, ignoresErrors, query });
  });

  test("should handle errors and reset isLoading", async () => {
    const asset = "exampleAsset";
    const error = new Error("Mock error");

    bruinQueryExport.run = async () => {
      throw error;
    };

    await bruinQueryExport.exportResults(asset, {});

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

    await bruinQueryExport.exportResults(asset, options);
  });

});
suite("CLI Installation and Update Tests", () => {
  let bruinInstallCLICheckBruinCliInstallationStub: sinon.SinonStub;
  let bruinInstallCLICheckBruinCLIVersionStub: sinon.SinonStub;
  let bruinInstallCLIInstallOrUpdateStub: sinon.SinonStub;
  let vscodeWindowShowWarningMessageStub: sinon.SinonStub;

  setup(() => {
    bruinInstallCLICheckBruinCliInstallationStub = sinon.stub(
      BruinInstallCLI.prototype,
      "checkBruinCliInstallation"
    );
    bruinInstallCLICheckBruinCLIVersionStub = sinon.stub(
      BruinInstallCLI.prototype,
      "checkBruinCLIVersion"
    );
    bruinInstallCLIInstallOrUpdateStub = sinon.stub(BruinInstallCLI.prototype, "installOrUpdate");
    vscodeWindowShowWarningMessageStub = sinon.stub(vscode.window, "showWarningMessage");
  });

  teardown(() => {
    bruinInstallCLICheckBruinCliInstallationStub.restore();
    bruinInstallCLICheckBruinCLIVersionStub.restore();
    bruinInstallCLIInstallOrUpdateStub.restore();
    vscodeWindowShowWarningMessageStub.restore();
  });

  test("should install or update CLI when not installed", async () => {
    const isInstalled = { installed: false };
    bruinInstallCLICheckBruinCliInstallationStub.resolves(isInstalled);

    await installOrUpdateCli();

    assert.ok(
      bruinInstallCLICheckBruinCliInstallationStub.calledOnce,
      "Expected checkBruinCliInstallation to be called"
    );
    assert.ok(
      bruinInstallCLIInstallOrUpdateStub.calledOnce,
      "Expected installOrUpdate to be called with false"
    );
    assert.ok(
      bruinInstallCLIInstallOrUpdateStub.calledWith(false),
      "Expected installOrUpdate to be called with false"
    );
  });

  test("should update CLI when already installed", async () => {
    const isInstalled = { installed: true };
    bruinInstallCLICheckBruinCliInstallationStub.resolves(isInstalled);

    await installOrUpdateCli();

    assert.ok(
      bruinInstallCLICheckBruinCliInstallationStub.calledOnce,
      "Expected checkBruinCliInstallation to be called"
    );
    assert.ok(
      bruinInstallCLIInstallOrUpdateStub.calledOnce,
      "Expected installOrUpdate to be called with true"
    );
    assert.ok(
      bruinInstallCLIInstallOrUpdateStub.calledWith(true),
      "Expected installOrUpdate to be called with true"
    );
  });

  test("should not show warning message when CLI is up-to-date", async () => {
    bruinInstallCLICheckBruinCLIVersionStub.resolves(true);

    await checkBruinCliVersion();

    assert.ok(
      bruinInstallCLICheckBruinCLIVersionStub.calledOnce,
      "Expected checkBruinCLIVersion to be called"
    );
    assert.ok(
      vscodeWindowShowWarningMessageStub.notCalled,
      "Expected no warning message to be shown"
    );
  });

  test("should close warning message when close button is clicked", async () => {
    const message = "Your CLI is outdated. Please update it to access all the latest features.";
    const closeButton = "Close";
    bruinInstallCLICheckBruinCLIVersionStub.resolves(false);
    vscodeWindowShowWarningMessageStub.resolves(closeButton);

    await checkBruinCliVersion();

    assert.ok(
      vscodeWindowShowWarningMessageStub.calledOnce,
      "Expected warning message to be shown"
    );
    assert.ok(
      vscodeWindowShowWarningMessageStub.firstCall.args[1].includes(closeButton),
      "Expected close button to be present"
    );
  });
});
/* suite("BruinEnvList Tests", () => {
  let bruinEnvList: BruinEnvList;
  let runStub: sinon.SinonStub;
  let postMessageToPanelsStub: sinon.SinonStub;
  let BruinPanelPostMessageStub: sinon.SinonStub;

  setup(() => {
    bruinEnvList = new BruinEnvList();
    runStub = sinon.stub(BruinCommand.prototype, "run");
    postMessageToPanelsStub = sinon.stub(BruinEnvList.prototype, "postMessageToPanels");
    BruinPanelPostMessageStub = sinon.stub(BruinPanel, "postMessage");
  });

  teardown(() => {
    runStub.restore();
    postMessageToPanelsStub.restore();
    BruinPanelPostMessageStub.restore();
  });

  test("should return 'environments' as the Bruin command string", () => {
    assert.strictEqual(bruinEnvList.bruinCommand(), "environments");
  });

  test("should get environments list successfully", async () => {
    const result = "{ environments: [ { id: 1, name: 'env1' } ] }";
    runStub.resolves(result);

    await bruinEnvList.getEnvironmentsList();

    assert.ok(runStub.calledOnce, "Expected run to be called");
    assert.deepStrictEqual(runStub.firstCall.args, [["list", "-o", "json"]], "Expected correct flags to be passed");
    assert.ok(postMessageToPanelsStub.calledOnce, "Expected postMessageToPanels to be called");
    assert.deepStrictEqual(postMessageToPanelsStub.firstCall.args, ["success", result], "Expected success message to be posted");
    assert.ok(BruinPanelPostMessageStub.calledOnce, "Expected BruinPanel.postMessage to be called");
    assert.deepStrictEqual(BruinPanelPostMessageStub.firstCall.args, ["environments-list-message", { status: "success", message: result }], "Expected correct message to be posted to BruinPanel");
  });

  test("should handle errors when getting environments list", async () => {
    const error = "Error getting environments list";
    runStub.rejects(new Error(error));

    await bruinEnvList.getEnvironmentsList();

    assert.ok(runStub.calledOnce, "Expected run to be called");
    assert.deepStrictEqual(runStub.firstCall.args, [["list", "-o", "json"]], "Expected correct flags to be passed");
    assert.ok(postMessageToPanelsStub.calledOnce, "Expected postMessageToPanels to be called");
    assert.deepStrictEqual(postMessageToPanelsStub.firstCall.args, ["error", error], "Expected error message to be posted");
    assert.ok(BruinPanelPostMessageStub.calledOnce, "Expected BruinPanel.postMessage to be called");
    assert.deepStrictEqual(BruinPanelPostMessageStub.firstCall.args, ["environments-list-message", { status: "error", message: error }], "Expected correct error message to be posted to BruinPanel");
  });

  test("should ignore errors when getting environments list with ignoresErrors option", async () => {
    const error = "Error getting environments list";
    runStub.rejects(new Error(error));

    await bruinEnvList.getEnvironmentsList({ ignoresErrors: true });

    assert.ok(runStub.calledOnce, "Expected run to be called");
    assert.deepStrictEqual(runStub.firstCall.args, [["list", "-o", "json"]], "Expected correct flags to be passed");
    assert.ok(postMessageToPanelsStub.notCalled, "Expected postMessageToPanels not to be called");
    assert.ok(BruinPanelPostMessageStub.notCalled, "Expected BruinPanel.postMessage not to be called");
  });

  test("should post message to panels correctly", () => {
    const status = "success";
    const message = "Environments list retrieved successfully";

    bruinEnvList.postMessageToPanels(status, message);

    assert.ok(BruinPanelPostMessageStub.calledOnce, "Expected BruinPanel.postMessage to be called");
    assert.deepStrictEqual(BruinPanelPostMessageStub.firstCall.args, ["environments-list-message", { status, message }], "Expected correct message to be posted to BruinPanel");
  });
}); */
suite("Activate Tests", () => {
  let context: vscode.ExtensionContext;
  let setupFoldingOnOpenStub: sinon.SinonStub;
  let subscribeToConfigurationChangesStub: sinon.SinonStub;
  let getDefaultBruinExecutablePathStub: sinon.SinonStub;
  let vscodeWindowActiveTextEditorStub: sinon.SinonStub;
  let vscodeCommandsExecuteCommandStub: sinon.SinonStub;
  let vscodeLanguagesRegisterFoldingRangeProviderStub: sinon.SinonStub;
  let vscodeWindowRegisterWebviewViewProviderStub: sinon.SinonStub;

  setup(() => {
    context = {
      extensionUri: vscode.Uri.file(""),
      subscriptions: [],
    } as any;
    setupFoldingOnOpenStub = sinon.stub(configuration, "setupFoldingOnOpen");
    subscribeToConfigurationChangesStub = sinon.stub(
      configuration,
      "subscribeToConfigurationChanges"
    );
    getDefaultBruinExecutablePathStub = sinon.stub(configuration, "getDefaultBruinExecutablePath");
    vscodeWindowActiveTextEditorStub = sinon.stub(vscode.window, "activeTextEditor").value(null);
    vscodeCommandsExecuteCommandStub = sinon.stub(vscode.commands, "executeCommand");
    vscodeLanguagesRegisterFoldingRangeProviderStub = sinon.stub(
      vscode.languages,
      "registerFoldingRangeProvider"
    );
    vscodeWindowRegisterWebviewViewProviderStub = sinon.stub(
      vscode.window,
      "registerWebviewViewProvider"
    );
  });

  teardown(() => {
    setupFoldingOnOpenStub.restore();
    subscribeToConfigurationChangesStub.restore();
    getDefaultBruinExecutablePathStub.restore();
    vscodeWindowActiveTextEditorStub.restore();
    vscodeCommandsExecuteCommandStub.restore();
    vscodeLanguagesRegisterFoldingRangeProviderStub.restore();
    vscodeWindowRegisterWebviewViewProviderStub.restore();
  });

  test("should focus active editor on activation", async () => {
    const activeTextEditor = {
      document: {
        uri: vscode.Uri.file("file:///example.py"),
      },
    };
    vscodeWindowActiveTextEditorStub.value(activeTextEditor);

    await activate(context);

    assert.ok(vscodeCommandsExecuteCommandStub.calledOnce, "Expected command to be executed");
    assert.strictEqual(
      vscodeCommandsExecuteCommandStub.firstCall.args[0],
      "workbench.action.focusActiveEditorGroup",
      "Expected focus active editor group command"
    );
  });

  /*   test('should setup folding on open', async () => {
    await activate(context);

    assert.ok(setupFoldingOnOpenStub.calledOnce, 'Expected setupFoldingOnOpen to be called');
  });

  test('should subscribe to configuration changes', async () => {
    await activate(context);

    assert.ok(subscribeToConfigurationChangesStub.calledOnce, 'Expected subscribeToConfigurationChanges to be called');
  }); */
});
