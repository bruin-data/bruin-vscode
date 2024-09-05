import * as assert from "assert";
import * as vscode from "vscode";
import * as os from "os";
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
    assert.strictEqual(getFileExtension("example.txt"), "txt");
    assert.strictEqual(getFileExtension("example.sql"), "sql");
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

  /*   test("isYamlBruinAsset should return true for Yaml Bruin assets", async () => {
    assert.strictEqual(await isYamlBruinAsset("example.asset.yml"), true);
    assert.strictEqual(await isYamlBruinAsset("example.asset.yaml"), true);
    assert.strictEqual(await isYamlBruinAsset("example.txt"), false);
  }); */

  test("isBruinYaml should return true for .bruin.yml files", async () => {
    assert.strictEqual(await isBruinYaml(".bruin.yml"), true);
    assert.strictEqual(await isBruinYaml("example.yml"), false);
  });

  /*   test("isBruinAsset should return true for valid Bruin assets", async () => {
    assert.strictEqual(await isBruinAsset("example.py", ["py"]), true);
    assert.strictEqual(await isBruinAsset("example.asset.yml", ["asset.yml", "asset.yaml"]), true);
    assert.strictEqual(await isBruinAsset("example.txt", ["py", "sql", "asset.yml", "asset.yaml"]), false);
  }); */

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
  let osStub: sinon.SinonStub<[], string>;
  let execAsyncStub: sinon.SinonStub<[string], Promise<{ stdout: string; stderr: string }>>;
  let promisifyStub: sinon.SinonStub;
  let checkBruinCliInstallation: any;

  setup(function () {
    osStub = sinon.stub(os, "platform");
    execAsyncStub = sinon.stub();
    promisifyStub = sinon.stub().returns(execAsyncStub);

    const proxyquire = require("proxyquire");
    ({ checkBruinCliInstallation } = proxyquire("../bruin/bruinUtils", {
      os: { platform: () => osStub() },
      util: { promisify: promisifyStub },
      child_process: { exec: sinon.stub() },
    }));
  });

  teardown(function () {
    sinon.restore();
  });

  test("Should return installed true on non-Windows when bruin is installed", async function () {
    osStub.returns("darwin");
    execAsyncStub.withArgs("bruin --version").resolves({ stdout: "version info", stderr: "" });

    const result = await checkBruinCliInstallation();
    assert.deepStrictEqual(result, { installed: true, isWindows: false, goInstalled: false });
  });

  test('Should return installed false on non-Windows when bruin is not installed', async function() {
    osStub.returns('darwin');
    execAsyncStub.withArgs('bruin --version').rejects(new Error("Command failed: bruin --version"));

    const result = await checkBruinCliInstallation();
    assert.deepStrictEqual(result, { installed: false, isWindows: false, goInstalled: false });
  });
  
  test('Should return correct values on Windows when bruin is installed', async function() {
    osStub.returns('win32');
    execAsyncStub.withArgs('bruin --version').resolves({ stdout: 'version info', stderr: '' });

    const result = await checkBruinCliInstallation();
    assert.deepStrictEqual(result, { installed: true, isWindows: true, goInstalled: false });
  });

  test("Should check for Go on Windows when bruin is not installed", async function () {
    osStub.returns("win32");
    execAsyncStub.withArgs("bruin --version").rejects(new Error("Command not found"));
    execAsyncStub.withArgs("go version").resolves({ stdout: "go version info", stderr: "" });

    const result = await checkBruinCliInstallation();
    assert.deepStrictEqual(result, { installed: false, isWindows: true, goInstalled: true });
  });

  test("Should return goInstalled false on Windows when neither bruin nor Go are installed", async function () {
    osStub.returns("win32");
    execAsyncStub.withArgs("bruin --version").rejects(new Error("Command not found"));
    execAsyncStub.withArgs("go version").rejects(new Error("Command not found"));

    const result = await checkBruinCliInstallation();
    assert.deepStrictEqual(result, { installed: false, isWindows: true, goInstalled: false });
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
        default: {
          connections: {
            aws: null,
            google_cloud_platform: [
              {
                project_id: "gcp_project",
              },
            ],
            snowflake: [
              {
                project_id: "snowflake_project",
              },
            ],
          },
        },
      },
    };
    const connections = extractNonNullConnections(singleEnvconnections);
    assert.deepStrictEqual(connections, [
      { environment: "default", type: "google_cloud_platform", name: null },
      { environment: "default", type: "snowflake", name: null },
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
                project_id: "gcp_project",
              },
            ],
          },
        },
        staging: {
          connections: {
            aws: [
              {
                name: "aws_project",
              },
            ],
            snowflake: null,
          },
        },
      },
    };
    const connections = extractNonNullConnections(multiEnvconnections);
    assert.deepStrictEqual(connections, [
      { environment: "default", type: "google_cloud_platform", name: null },
      { environment: "staging", type: "aws", name: "aws_project" },
    ]);
  });
  test("Should handle connections without project_id or name", async () => {
    const singleEnvconnections = {
      environments: {
        default: {
          connections: {
            google_cloud_platform: [
              {
                // No project_id or name provided
              },
            ],
            aws: [
              {
                name: "aws_connection",
              },
            ],
          },
        },
      },
    };
    const connections = extractNonNullConnections(singleEnvconnections);
    assert.deepStrictEqual(connections, [
      { environment: "default", type: "google_cloud_platform", name: null }, // No project_id or name
      { environment: "default", type: "aws", name: "aws_connection" },
    ]);
  });
  test("Should return an empty array when input is completely empty", async () => {
    const emptyConnections = {};
    const connections = extractNonNullConnections(emptyConnections);
    assert.deepStrictEqual(connections, []);
  });
  test("Should return an empty array when connections object is empty", async () => {
    const singleEnvconnections = {
      environments: {
        default: {
          connections: {},
        },
      },
    };
    const connections = extractNonNullConnections(singleEnvconnections);
    assert.deepStrictEqual(connections, []);
  });

  test("Should return an empty array when environments key is missing", async () => {
    const missingEnvironmentsKey = {
      connections: {
        aws: [
          {
            name: "aws_connection",
          },
        ],
      },
    };
    const connections = extractNonNullConnections(missingEnvironmentsKey);
    assert.deepStrictEqual(connections, []);
  });
});
