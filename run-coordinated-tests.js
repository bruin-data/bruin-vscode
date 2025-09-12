#!/usr/bin/env node

/**
 * Custom test runner to run specific tests in sequence with coordination
 */

const { spawn } = require('child_process');
const path = require('path');

async function runTest(testPattern, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== STARTING: ${testName} ===\n`);
    
    // Set up environment variables for proper workspace detection
    const env = {
      ...process.env,
      TEST_WORKSPACE_PATH: process.env.TEST_WORKSPACE_PATH || path.join(process.cwd(), 'test-workspace')
    };
    
    const cmd = `extest setup-and-run '${testPattern}' --code_version 1.103.0 --code_settings settings.json`;
    const child = spawn('sh', ['-c', cmd], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env
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

async function createTestWorkspace() {
  const fs = require('fs');
  const workspacePath = path.join(process.cwd(), 'test-workspace');
  
  // Create workspace directory
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  
  // Create .bruin.yml file for extension activation
  const bruinConfig = `name: "test-pipeline"

environments:
  default:
    connections:
      snowflake_conn:
        type: snowflake
        account: test
        username: test
        password: test
        warehouse: test
        database: test
        schema: test
  dev:
    connections:
      postgres_conn:
        type: postgres
        host: localhost
        port: 5432
        username: test
        password: test
        database: test
`;
  
  fs.writeFileSync(path.join(workspacePath, '.bruin.yml'), bruinConfig);
  console.log(`Created test workspace at: ${workspacePath}`);
  
  // Set environment variable for tests to use
  process.env.TEST_WORKSPACE_PATH = workspacePath;
  return workspacePath;
}

async function runAllTests() {
  try {
    console.log('Starting coordinated test execution...');
    
    // Create test workspace first
    console.log('Setting up test workspace...');
    await createTestWorkspace();
    
    // Copy test assets
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