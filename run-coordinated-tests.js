#!/usr/bin/env node

/**
 * Custom test runner to run specific tests in sequence with coordination
 */

const { spawn } = require('child_process');
const path = require('path');

async function runTest(testPattern, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== STARTING: ${testName} ===\n`);
    
    const cmd = `extest setup-and-run '${testPattern}' --code_version 1.103.0 --code_settings settings.json`;
    const child = spawn('sh', ['-c', cmd], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== COMPLETED: ${testName} ===\n`);
        resolve(code);
      } else {
        console.log(`\n=== FAILED: ${testName} (code: ${code}) ===\n`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      console.error(`\n=== ERROR: ${testName} ===\n`, err);
      reject(err);
    });
  });
}

async function runAllTests() {
  try {
    console.log('Starting coordinated test execution...');
    
    // Copy test assets first
    console.log('Copying test assets...');
    await new Promise((resolve, reject) => {
      const child = spawn('node', ['webview-ui/scripts/copy-test-assets.js'], {
        stdio: 'inherit'
      });
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Asset copy failed: ${code}`)));
    });
    
    // Run tests in sequence with proper coordination
    await runTest('./out/ui-test/webview-tests.test.js', 'Bruin Webview Integration Tests');
    await runTest('./out/ui-test/ingestr-asset-ui-integration.test.js', 'Ingestr Asset UI Integration Tests');
    await runTest('./out/ui-test/connections-integration.test.js', 'Connections and Environments Integration Tests');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

runAllTests();