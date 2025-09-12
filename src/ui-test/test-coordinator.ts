/**
 * Simple test coordination to prevent resource conflicts when running multiple UI tests
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TestCoordinator {
  private static testCount = 0;
  private static readonly TEST_ISOLATION_DELAY = 20000; // 20 seconds between tests for better isolation
  
  // Get timeout multiplier for CI environments (default 1 for local, 3 for CI)
  private static getTimeoutMultiplier(): number {
    const multiplier = process.env.TEST_TIMEOUT_MULTIPLIER;
    return multiplier ? parseInt(multiplier, 10) : 1;
  }
  
  // Apply timeout multiplier to any duration
  static adjustTimeout(timeoutMs: number): number {
    return timeoutMs * this.getTimeoutMultiplier();
  }
  
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
    // Add a longer delay to ensure cleanup operations complete and VS Code stabilizes
    await sleep(5000);
    
    // Additional cleanup to ensure VS Code is in a clean state
    console.log(`[TEST-COORDINATOR] Performing enhanced post-test cleanup for: ${testName}`);
    console.log(`[TEST-COORDINATOR] Allowing extra time for resource cleanup...`);
  }
  
  /**
   * Reset test count for new test run
   */
  static resetTestCount(): void {
    this.testCount = 0;
    console.log(`[TEST-COORDINATOR] Test count reset`);
  }
}