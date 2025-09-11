/**
 * Simple test coordination to prevent resource conflicts when running multiple UI tests
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TestCoordinator {
  private static testCount = 0;
  private static readonly TEST_ISOLATION_DELAY = 5000; // 5 seconds between tests
  
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
    // Add a small delay to ensure cleanup operations complete
    await sleep(1000);
  }
}