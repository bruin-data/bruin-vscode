/**
 * Test coordination to prevent resource conflicts when running multiple UI tests.
 * Uses condition-based waiting instead of arbitrary delays.
 */

import { VSBrowser, Workbench } from "vscode-extension-tester";
import { By } from "selenium-webdriver";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TestCoordinator {
  private static testCount = 0;
  private static readonly MIN_ISOLATION_DELAY = 1000;
  private static readonly MAX_ISOLATION_DELAY = 5000;
  private static isInitialized = false;

  /**
   * Call this at the beginning of each test suite's before() hook.
   * Ensures proper sequencing and isolation between tests.
   */
  static async acquireTestSlot(testName: string): Promise<void> {
    this.testCount++;
    const currentTest = this.testCount;

    console.log(`[TEST-COORDINATOR] Test ${currentTest} (${testName}) acquiring slot...`);

    if (currentTest > 1) {
      console.log(`[TEST-COORDINATOR] Test ${currentTest} waiting for previous test cleanup...`);
      await this.waitForCleanState();
    }

    if (!this.isInitialized) {
      await this.initializeTestEnvironment();
      this.isInitialized = true;
    }

    console.log(`[TEST-COORDINATOR] Test ${currentTest} (${testName}) proceeding with setup`);
  }

  /**
   * Call this in each test suite's after() hook.
   * Signals that the test is done and resources can be cleaned up.
   */
  static async releaseTestSlot(testName: string): Promise<void> {
    console.log(`[TEST-COORDINATOR] Releasing slot: ${testName}`);

    try {
      await this.performCleanup();
    } catch (error) {
      console.log(`[TEST-COORDINATOR] Cleanup warning:`, error);
    }

    console.log(`[TEST-COORDINATOR] Test completed: ${testName}`);
  }

  /**
   * Wait for VS Code to be in a clean state ready for the next test
   */
  private static async waitForCleanState(): Promise<void> {
    const startTime = Date.now();
    const maxWait = this.MAX_ISOLATION_DELAY;

    while (Date.now() - startTime < maxWait) {
      try {
        const driver = VSBrowser.instance.driver;

        // Check for loading indicators
        const loadingIndicators = await driver.findElements(
          By.css('.spinner, .animate-spin, [class*="loading"], .progress-bar')
        );

        const visibleLoading = await Promise.all(
          loadingIndicators.map(async (el) => {
            try {
              return await el.isDisplayed();
            } catch {
              return false;
            }
          })
        );

        if (!visibleLoading.some(Boolean)) {
          // No visible loading indicators, state is clean
          console.log(`[TEST-COORDINATOR] Clean state achieved in ${Date.now() - startTime}ms`);
          return;
        }
      } catch {
        // Driver operations may fail during transitions
      }

      await sleep(200);
    }

    // Fallback: minimum isolation delay
    console.log(`[TEST-COORDINATOR] Max wait reached, proceeding with minimum delay`);
    await sleep(this.MIN_ISOLATION_DELAY);
  }

  /**
   * Initialize the test environment
   */
  private static async initializeTestEnvironment(): Promise<void> {
    console.log(`[TEST-COORDINATOR] Initializing test environment...`);

    try {
      const workbench = new Workbench();

      // Disable walkthrough and welcome screens
      const disableCommands = [
        "workbench.action.closeWalkthrough",
        "workbench.welcome.close",
        "workbench.action.closeAllEditors",
      ];

      for (const command of disableCommands) {
        try {
          await workbench.executeCommand(command);
        } catch {
          // Command may not exist
        }
      }

      console.log(`[TEST-COORDINATOR] Test environment initialized`);
    } catch (error) {
      console.log(`[TEST-COORDINATOR] Environment init warning:`, error);
    }
  }

  /**
   * Perform cleanup after test completion
   */
  private static async performCleanup(): Promise<void> {
    try {
      const workbench = new Workbench();

      // Close all editors
      await workbench.executeCommand("workbench.action.closeAllEditors");

      // Wait briefly for cleanup to complete
      await sleep(300);

      // Verify cleanup
      const editorView = workbench.getEditorView();
      const openTitles = await editorView.getOpenEditorTitles();

      if (openTitles.length > 0) {
        console.log(`[TEST-COORDINATOR] ${openTitles.length} editors still open after cleanup`);

        // Force close remaining editors
        for (const title of openTitles) {
          try {
            await editorView.closeEditor(title);
          } catch {
            // Editor may have closed already
          }
        }
      }
    } catch {
      // Cleanup operations may fail, but shouldn't block tests
    }
  }

  /**
   * Reset state for fresh test runs
   */
  static reset(): void {
    this.testCount = 0;
    this.isInitialized = false;
  }
}
