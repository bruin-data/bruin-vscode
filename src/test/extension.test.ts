/* eslint-disable @typescript-eslint/naming-convention */
import * as assert from "assert";
import * as vscode from "vscode";
import * as os from "os";
import * as util from "util";

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
import * as fs from "fs";
import path = require("path");
import sinon = require("sinon");
import * as childProcess from "child_process";
import { bruinWorkspaceDirectory, findGitBashPath } from "../bruin/bruinUtils";
import { BruinInternalPatch } from "../bruin/bruinInternalPatch";
const proxyquire = require("proxyquire").noCallThru();

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

suite("patch asset testing", () => {
  let bruinInternalPatch: BruinInternalPatch;
  let runStub: sinon.SinonStub;
  let postMessageToPanelsStub: sinon.SinonStub;

  setup(() => {
    bruinInternalPatch = new BruinInternalPatch('bruin', 'workingDirectory');
    runStub = sinon.stub(bruinInternalPatch as any, 'run');
    postMessageToPanelsStub = sinon.stub(bruinInternalPatch as any, 'postMessageToPanels');
  });

  teardown(() => {
    sinon.restore();
  });

  test('should call run with correct arguments and post success message', async () => {
    const body = { key: 'value' };
    const filePath = 'path/to/asset';
    const result = 'success result';
    runStub.resolves(result);

    await bruinInternalPatch.patchAsset(body, filePath);

    sinon.assert.calledOnceWithExactly(runStub, ['patch-asset', '--body', JSON.stringify(body), filePath]);
    sinon.assert.calledOnceWithExactly(postMessageToPanelsStub, 'success', result);
  });

  test('should call run with correct arguments and post error message on failure', async () => {
    const body = { key: 'value' };
    const filePath = 'path/to/asset';
    const error = new Error('error message');
    runStub.rejects(error);

    await bruinInternalPatch.patchAsset(body, filePath);

    sinon.assert.calledOnceWithExactly(runStub, ['patch-asset', '--body', JSON.stringify(body), filePath]);
    sinon.assert.calledOnceWithExactly(postMessageToPanelsStub, 'error', error);
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

suite('workspaceDirectory Tests', () => {
  let fsStatStub: sinon.SinonStub;
  let fsAccessStub: sinon.SinonStub;
  let pathDirnameStub: sinon.SinonStub;

  setup(() => {
    fsStatStub = sinon.stub(fs.promises, 'stat');
    fsAccessStub = sinon.stub(fs.promises, 'access');
    pathDirnameStub = sinon.stub(path, 'dirname');
  });

  teardown(() => {
    sinon.restore();
  });

  test('should find the Bruin workspace directory', async () => {
    const fsPath = '/path/to/project/file.txt';
    const bruinRootFile = '/path/to/project/.bruin.yaml';

    fsStatStub.resolves({ isFile: () => true });
    fsAccessStub.withArgs(bruinRootFile, fs.constants.F_OK).resolves();
    pathDirnameStub.callsFake((dir) => {
      if (dir === '/path/to/project/file.txt') {return '/path/to/project';}
      if (dir === '/path/to/project') {return '/path/to';}
      if (dir === '/path/to') {return '/path';}
      if (dir === '/path') {return '/';}
      return '/';
    });

    const result = await bruinWorkspaceDirectory(fsPath);
    assert.strictEqual(result, '/path/to/project');
  });

  test('should return undefined if Bruin workspace directory is not found', async () => {
    const fsPath = '/path/to/project/file.txt';

    fsStatStub.resolves({ isFile: () => true });
    fsAccessStub.rejects(new Error('File not found'));
    pathDirnameStub.callsFake((dir) => {
      if (dir === '/path/to/project/file.txt') {return '/path/to/project';}
      if (dir === '/path/to/project') {return '/path/to';}
      if (dir === '/path/to') {return '/path';}
      if (dir === '/path') {return '/';}
      return '/';
    });

    const result = await bruinWorkspaceDirectory(fsPath);
    assert.strictEqual(result, undefined);
  });

/*   test('should handle errors and log them', async () => {
    const fsPath = '/path/to/project/file.txt';
    const error = new Error('unexpected error');
    const consoleLogStub = sinon.stub(console, 'log');

    fsStatStub.rejects(error);

    const result = await bruinWorkspaceDirectory(fsPath);
    assert.strictEqual(result, undefined);
    sinon.assert.calledOnce(consoleLogStub);
    sinon.assert.calledWithExactly(consoleLogStub, 'failed to find the workspace directory', error);
  }); */

  test('should stop searching after reaching the maximum iteration limit', async () => {
    const fsPath = '/path/to/project/file.txt';

    fsStatStub.resolves({ isFile: () => true });
    fsAccessStub.rejects(new Error('File not found'));
    pathDirnameStub.callsFake((dir) => {
      if (dir === '/path/to/project/file.txt') {return '/path/to/project';}
      if (dir === '/path/to/project') {return '/path/to';}
      if (dir === '/path/to') {return '/path';}
      if (dir === '/path') {return '/';}
      return '/';
    });

    const result = await bruinWorkspaceDirectory(fsPath);
    assert.strictEqual(result, undefined);
  });
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
suite("checkBruinCliInstallation Tests", function () {
  let osStub: sinon.SinonStub;
  let execAsyncStub: sinon.SinonStub;
  let promisifyStub: sinon.SinonStub<[fn: Function], Function>;
  let BruinInstallCLI: new () => any;

  setup(function () {
    // Initialize stubs
    osStub = sinon.stub(os, "platform");
    execAsyncStub = sinon.stub();
    promisifyStub = sinon.stub(util, "promisify").returns(execAsyncStub);

    // Import proxyquire here so stubs are set up before importing BruinInstallCLI
    const proxyquire = require("proxyquire");

    // Import BruinInstallCLI with proxyquire
    const module = proxyquire("../bruin/bruinInstallCli", {
      os: { platform: () => osStub() },
      util: { promisify: promisifyStub },
      child_process: { exec: sinon.stub() },
    });

    BruinInstallCLI = module.BruinInstallCLI;
  });

  teardown(function () {
    // Restore stubs
    osStub.restore();
    promisifyStub.restore();
  });

  test("Should return installed true on non-Windows when bruin is installed", async function () {
    osStub.returns("darwin");
    execAsyncStub.resolves({ stdout: "bruin version 1.0.0" });

    const bruinInstallCLI = new BruinInstallCLI();
    const result = await bruinInstallCLI.checkBruinCliInstallation();

    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.isWindows, false);
  });

  test("Should return installed true on non-Windows when bruin is installed", async function () {
    osStub.returns("darwin");
    execAsyncStub.resolves({ stdout: "bruin version 1.0.0" });

    const bruinInstallCLI = new BruinInstallCLI();
    const result = await bruinInstallCLI.checkBruinCliInstallation();

    assert.strictEqual(result.installed, true);
    assert.strictEqual(result.isWindows, false);
  });

  test("Should return correct values on Windows when bruin is installed", async function () {
    osStub.returns("win32");
    execAsyncStub.withArgs("bruin --version").resolves({ stdout: "version info", stderr: "" });
    execAsyncStub.withArgs("git --version").resolves({ stdout: "git version info", stderr: "" });

    const manager = new BruinInstallCLI();
    const result = await manager.checkBruinCliInstallation();
    assert.deepStrictEqual(result, { installed: true, isWindows: true, gitAvailable: true });
  });

  test("Should check for Git on Windows when bruin is not installed", async function () {
    osStub.returns("win32");
    execAsyncStub.withArgs("bruin --version").rejects(new Error("Command not found")); // Simulate Bruin CLI not installed
    console.log("execAsyncStub reject error:", execAsyncStub.withArgs("bruin --version").rejects); // Verify the reject reason
  
    execAsyncStub.withArgs("git --version").resolves({ stdout: "git version info", stderr: "" }); // Git is installed
  
    const bruinInstallCLI = new BruinInstallCLI();
    const result = await bruinInstallCLI.checkBruinCliInstallation();
  
    console.log("Result:", result); // Verify the result
    //assert.strictEqual(result.installed, false);
   assert.deepStrictEqual(result, { installed: false, isWindows: true, gitAvailable: true });
  });

  test("Should return gitAvailable false on Windows when neither bruin nor Git are installed", async function () {
    osStub.returns("win32");
    execAsyncStub.withArgs("bruin --version").rejects(new Error("Command not found")); // Simulate Bruin CLI not installed
    execAsyncStub.withArgs("git --version").rejects(new Error("Command not found")); // Simulate Git not installed

    const bruinInstallCLI = new BruinInstallCLI();
    const result = await bruinInstallCLI.checkBruinCliInstallation();

    assert.deepStrictEqual(result, { installed: false, isWindows: true, gitAvailable: false });
  });

});


/* suite('findGitBashPath Tests', () => {
  let osStub: sinon.SinonStub;
  let fsStub: sinon.SinonStub;
  let childProcessExecSyncStub: sinon.SinonStub;
  let pathDirnameStub: sinon.SinonStub;
  let pathJoinStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;
  let findGitBashPath: () => string | undefined;
  let commonGitPaths: string[];
  const homedir = os.homedir();
  setup(() => {
    // Initialize stubs
    osStub = sinon.stub(os, 'platform');
    fsStub = sinon.stub(fs, 'existsSync');
    childProcessExecSyncStub = sinon.stub(childProcess, 'execSync');
    pathDirnameStub = sinon.stub(path, 'dirname');
    pathJoinStub = sinon.stub(path, 'join');
    consoleErrorStub = sinon.stub(console, 'error');

    // Import findGitBashPath with proxyquire
    const module = proxyquire('../bruin/bruinUtils', {
      os: { platform: osStub },
      fs: { existsSync: fsStub },
      child_process: { execSync: childProcessExecSyncStub },
      path: {
        dirname: pathDirnameStub,
        join: pathJoinStub,
      }
    });

    // Assign imported functions/variables for testing
    findGitBashPath = module.findGitBashPath;
    commonGitPaths = [
      path.join(homedir, "AppData", "Local", "Programs", "Git", "bin", "bash.exe"),
      path.join(homedir, "AppData", "Local", "Programs", "Git", "usr", "bin", "bash.exe"),
      "C:\\Program Files\\Git\\bin\\bash.exe",
      "C:\\Program Files\\Git\\usr\\bin\\bash.exe"  
    ];
  });

  teardown(() => {
    // Restore stubs
    osStub.restore();
    fsStub.restore();
    childProcessExecSyncStub.restore();
    pathDirnameStub.restore();
    pathJoinStub.restore();
    consoleErrorStub.restore();
  });

  test('Returns first existing Git path from commonGitPaths', async () => {
    fsStub.withArgs(commonGitPaths[0]).returns(true);
    const result = findGitBashPath();
    assert.deepStrictEqual(result, commonGitPaths[0]);
  });

  test('Finds Git Bash path on Windows when Git is installed', async () => {
    // Arrange
    osStub.returns('win32');
    fsStub.withArgs(commonGitPaths[0]).returns(false); // None of the common paths exist
    childProcessExecSyncStub.returns('C:\\Program Files\\Git\\cmd\\git.exe'); 
    pathDirnameStub.returns('C:\\Program Files\\Git\\cmd');
    pathJoinStub.returns('C:\\Program Files\\Git\\bin\\bash.exe');
    fsStub.withArgs('C:\\Program Files\\Git\\bin\\bash.exe').returns(true); 

    const result = findGitBashPath();

    assert.deepStrictEqual(result, 'C:\\Program Files\\Git\\bin\\bash.exe');
    assert.deepStrictEqual(consoleErrorStub.called, false);
  });

  test('Returns undefined on Windows when Git bash.exe does not exist', async () => {
    // Arrange
    osStub.returns('win32');
    fsStub.withArgs(commonGitPaths[0]).returns(false); 
    childProcessExecSyncStub.returns('C:\\Program Files\\Git\\cmd\\git.exe');
    pathDirnameStub.returns('C:\\Program Files\\Git\\cmd');
    pathJoinStub.returns('C:\\Program Files\\Git\\bin\\bash.exe');
    fsStub.withArgs('C:\\Program Files\\Git\\bin\\bash.exe').returns(false); 

    // Act
    const result = findGitBashPath();

    // Assert
    assert.deepStrictEqual(result, undefined);
    assert.deepStrictEqual(consoleErrorStub.called, false); 
  });

  test('Handles error when running execSync', async () => {
    // Arrange
    osStub.returns('win32');
    fsStub.withArgs(commonGitPaths[0]).returns(false); 
    childProcessExecSyncStub.throws(new Error('Mocked execSync error'));

    // Act
    const result = findGitBashPath();

    // Assert
    assert.deepStrictEqual(result, undefined);
    assert.deepStrictEqual(consoleErrorStub.calledOnce, true);
  });
}); */
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
