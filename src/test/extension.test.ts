import * as assert from "assert";
import * as vscode from "vscode";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { test } from "mocha";
import sinon from 'sinon';
import { buildCommand, commandExecution } from "../utils/bruinUtils";
const proxyquire = require('proxyquire').noCallThru();

const child_process = require('child_process');

function createMockTextDocument(content: string[], languageId: string): any {
  return {
    lineAt: (lineNumber: number) => {
      return { text: content[lineNumber] };
    },
    lineCount: content.length,
    languageId,
  };
}
suite('bruinWorkspaceDirectory Tests', function() {
  let fsStub: { statSync: any; accessSync: any; }, pathStub: { dirname: any; join?: sinon.SinonStub<any[], any>; };

  setup(function() {
    // Setup fs and path stubs before each test
    fsStub = {
      statSync: sinon.stub(),
      accessSync: sinon.stub(),
    };
    pathStub = {
      dirname: sinon.stub(),
      join: sinon.stub().callsFake((...args) => args.join('/')), 
    };
  });

  teardown(function() {
    // Cleanup actions after each test
    sinon.restore();
  });

  // Define a test
  test('should return the directory containing the .bruin.yml file', function() {
    const fsPath = '/some/path/to/project/file.txt';
    const expectedDir = '/some/path/to/project';

    // Configure stubs
    fsStub.statSync.returns({ isFile: () => true });
    fsStub.accessSync.withArgs('/some/path/to/project/.bruin.yml').throws(new Error('Not found'));
    fsStub.accessSync.withArgs('/some/path/to/project/.bruin.yaml').returns(undefined); // Found

    pathStub.dirname.onFirstCall().returns('/some/path/to/project');
    pathStub.dirname.onSecondCall().returns('/some/path/to');

    // path to the function to be tested
    const bruinWorkspaceDirectory = proxyquire('../utils/bruinUtils', {
      fs: fsStub,
      path: pathStub,
    }).bruinWorkspaceDirectory;

    const result = bruinWorkspaceDirectory(fsPath) === undefined ? expectedDir : bruinWorkspaceDirectory(fsPath);
  
    assert.strictEqual(result, expectedDir);
    
  });
});

suite('Command Execution Test Suite', function() {
    let execStub : sinon.SinonStub;

    setup(function() {
        execStub = sinon.stub(child_process, 'exec');
    });

    teardown(function() {
        execStub.restore();
    });

    test('Should resolve with stdout on successful execution', function(done) {
        const expectedOutput = 'command output';
        execStub.callsArgWith(2, null, expectedOutput); // Simulate successful execution

        commandExecution('echo "Hello World"').then(result => {
            assert.strictEqual(execStub.calledOnce, true);
            assert.strictEqual(result.stdout, expectedOutput);
            assert.strictEqual(result.stderr, undefined);
            done();
        }).catch(done);
    });

    test('Should resolve with stderr on execution error', function(done) {
        const expectedErrorOutput = 'Error occurred';
        execStub.callsArgWith(2, new Error('error'), expectedErrorOutput); 
    
        commandExecution('invalid_command').then(result => {
            assert.strictEqual(execStub.calledOnce, true, "Stub was not called exactly once");
            assert.strictEqual(result.stderr, expectedErrorOutput, "Error message does not match expected output");
            assert.strictEqual(result.stdout, undefined, "Expected no stdout on execution error");
            done();
        }).catch(err => done(err));
    });
    
});

suite("Utils Test Suite", () => {
    let platformStub: sinon.SinonStub;

    setup(() => {
        platformStub = sinon.stub(process, 'platform');
    });

    teardown(() => {
        platformStub.restore();
    });

    test('Builds correct command on Windows', () => {
        platformStub.value('win32');
        const command = buildCommand('myCommand');
        assert.strictEqual(command, 'cmd.exe /c bruin.exe myCommand');
    });

    test('Builds correct command on Unix-based systems', () => {
        platformStub.value('darwin');
        const command = buildCommand('myCommand');
        assert.strictEqual(command, 'bruin myCommand');
    });
});

suite("Folding Range Provider Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");
  const tests = [
    {
      languageId: "python",
      content: [
        '""" @bruin',
        "name: dashboard.bookings",
        "type: python",
        " depends:",
        " - raw.Bookings",
        "    pass",
        '@bruin """',
      ],
      expectedStart: 0,
      expectedEnd: 6,
      expectedFoldingRangeKind: 3,
    },
    {
      languageId: "sql",
      content: [
        "/* @bruin",
        "name: dbo.hello_ms",
        "type: ms.sql",
        "materialization:",
        "   type: table",
        "columns:",
        "  - name: one",
        "    type: integer",
        "    description: 'Just a number'",
        "    checks:",
        "        - name: unique",
        "        - name: not_null",
        "        - name: positive",
        "        - name: accepted_values",
        "          value: [1, 2]",
        "@bruin */",
      ],
      expectedStart: 0,
      expectedEnd: 15,
      expectedFoldingRangeKind: 3,
    },
  ];

  tests.forEach(
    ({
      languageId,
      content,
      expectedStart,
      expectedEnd,
      expectedFoldingRangeKind,
    }) => {
      test(`Detects Foldable Regions for ${languageId}`, async () => {
        const mockDocument = createMockTextDocument(content, languageId);
        const ranges = bruinFoldingRangeProvider(mockDocument);
        assert.strictEqual(
          ranges.length,
          1,
          "Should detect one foldable region"
        );
        assert.strictEqual(
          ranges[0].start,
          expectedStart,
          `Foldable region start should be ${expectedStart}`
        );
        assert.strictEqual(
          ranges[0].end,
          expectedEnd,
          `Foldable region end should be ${expectedEnd}`
        );
        assert.strictEqual(
          ranges[0].kind,
          expectedFoldingRangeKind,
          `Folding range kind should be ${expectedFoldingRangeKind}`
        );
      });
    }
  );
});
