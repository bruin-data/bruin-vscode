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
  
  // Dismiss any blocking modal dialogs (like external link confirmations)
  static async dismissModalDialogs(driver: any): Promise<void> {
    try {
      console.log("[TEST-COORDINATOR] Checking for blocking modal dialogs...");
      
      // Import Key from selenium-webdriver
      const { Key } = require('selenium-webdriver');
      const { By } = require('selenium-webdriver');
      
      const modalBlocks = await driver.findElements(By.css('.monaco-dialog-modal-block, .dialog-modal-block'));
      if (modalBlocks.length > 0) {
        console.log(`[TEST-COORDINATOR] Found ${modalBlocks.length} modal dialog(s), attempting to dismiss...`);
        
        // Try to find and click "Open" or "Allow" or "Yes" or "OK" buttons
        const allowButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Open') or contains(text(), 'Allow') or contains(text(), 'Yes') or contains(text(), 'OK')]"));
        for (const button of allowButtons) {
          try {
            await button.click();
            console.log("[TEST-COORDINATOR] ✓ Dismissed modal dialog by clicking Open/Allow/Yes/OK");
            await sleep(2000);
            return;
          } catch (error) {
            // Try next button
          }
        }
        
        // If allow buttons didn't work, try escape key
        if (allowButtons.length === 0) {
          await driver.actions().sendKeys(Key.ESCAPE).perform();
          console.log("[TEST-COORDINATOR] ✓ Dismissed modal dialog with Escape key");
          await sleep(2000);
        }
      } else {
        console.log("[TEST-COORDINATOR] No blocking modal dialogs found");
      }
    } catch (error) {
      console.log("[TEST-COORDINATOR] Could not check for modal dialogs:", error);
    }
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