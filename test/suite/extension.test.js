const assert = require('assert');

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
	})
});
