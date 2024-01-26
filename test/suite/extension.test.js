const assert = require('assert');
const child_process = require('child_process');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require('vscode');
const bruinExtension = require('../../extension');

suite('Bruin Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('should return an object with stdout property', async () => {
	  const outputCommand = await bruinExtension.commandExcution('bruin --help');
	  assert.ok(outputCommand.hasOwnProperty('stdout'));
	});
	
	test('should return an object with stdout containing the output of the bruin --help command', async () => {
	  const expectedOutput = `bruin - The CLI used for managing Bruin-powered data pipelines`;
	  const outputCommand = await bruinExtension.commandExcution('bruin --help');
	assert.ok(outputCommand.stdout.includes(expectedOutput));
	});

	test('should return an error message if the command fails', async () => {
		const errorCommand = await bruinExtension.commandExcution('bruin render null');
	  assert.ok(errorCommand.stderr.includes("Command failed"));
	});

	test('should return an error message if the command does not exist', async () => {
		const errorCommand = await bruinExtension.commandExcution('command-not-found');
		assert.ok(errorCommand.stderr.includes("command not found"));
	});

	test('should generate correct HTML content for webview', () => {
		const renderedSql = 'SELECT 1 as one;';
		const filePath = '/path/to/file.sql';
		const htmlContent = bruinExtension.getWebviewContent(renderedSql, filePath);
	  
		assert.ok(htmlContent.includes('<pre class="sql-header">SQL File: /path/to/file.sql</pre>'));
		assert.ok(htmlContent.includes(`<pre>${renderedSql}</pre>`));
	});

	  
	  test('should return an error message if Bruin binary does not exist', () => {
		// Mock the child_process.execSync to simulate the absence of Bruin binary
		const originalExecSync = child_process.execSync;
		child_process.execSync = () => { throw new Error('Bruin does not exists'); };
	  
		const bruinNotInPath = bruinExtension.checkBruinBinary();
		
		// Restore the original function after the test
		child_process.execSync = originalExecSync;
	  
		assert.strictEqual(bruinNotInPath, true);
	  });
	  
	  
	  
});
