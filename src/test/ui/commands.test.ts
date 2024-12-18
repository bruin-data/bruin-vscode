import * as assert from 'assert';
import { Workbench } from 'vscode-extension-tester';
import { describe, it } from 'mocha';
import { BottomBarPanel, TerminalView } from 'vscode-extension-tester';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Sample Command palette tests', function () {
    this.timeout(150000); 

    it('Testing install Bruin CLI command', async () => {
		await new Workbench().executeCommand('Install Bruin CLI');
        await sleep(5000);
        const terminalView = await new TerminalView();
        await terminalView.selectChannel("Bruin Terminal");
        await terminalView.executeCommand("bruin --version");
        const terminalOutput = await terminalView.getText();
        console.log(terminalOutput);
        const versionAvailble = terminalOutput.includes('Current: ') && terminalOutput.includes('Latest: ');
        assert.strictEqual(versionAvailble, true);
	});
});