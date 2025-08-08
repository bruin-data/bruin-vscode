import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	version: '1.100.0',
	extensions: ['redhat.vscode-yaml@1.17.0'],
	launchArgs: [
		'--disable-extensions',
		'--log', 'off',
		'--disable-workspace-trust'
	],
});
