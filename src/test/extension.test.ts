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
