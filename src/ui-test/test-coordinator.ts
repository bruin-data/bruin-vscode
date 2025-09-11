/**
 * Simple test coordination to prevent resource conflicts when running multiple UI tests
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TestCoordinator {
  private static testCount = 0;
  private static readonly TEST_ISOLATION_DELAY = 15000; // 15 seconds between tests for better isolation
  
  /**
   * Call this at the beginning of each test suite's before() hook
   * Ensures proper sequencing and isolation between tests
   */
  static async acquireTestSlot(testName: string): Promise<void> {
    this.testCount++;
    const currentTest = this.testCount;
    
    console.log(`[TEST-COORDINATOR] Test ${currentTest} (${testName}) acquiring slot...`);
    
    if (currentTest > 1) {
      console.log(`[TEST-COORDINATOR] Test ${currentTest} waiting ${this.TEST_ISOLATION_DELAY}ms for test isolation...`);
      await sleep(this.TEST_ISOLATION_DELAY);
    }
    
    console.log(`[TEST-COORDINATOR] Test ${currentTest} (${testName}) proceeding with setup`);
  }
  
  /**
   * Call this in each test suite's after() hook
   * Signals that the test is done and resources can be cleaned up
   */
  static async releaseTestSlot(testName: string): Promise<void> {
    console.log(`[TEST-COORDINATOR] Test completed: ${testName}`);
    // Add a delay to ensure cleanup operations complete and VS Code stabilizes
    await sleep(3000);
    
    // Additional cleanup to ensure VS Code is in a clean state
    console.log(`[TEST-COORDINATOR] Performing post-test cleanup for: ${testName}`);
  }
  
  /**
   * Reset test count for new test run
   */
  static resetTestCount(): void {
    this.testCount = 0;
    console.log(`[TEST-COORDINATOR] Test count reset`);
  }
}