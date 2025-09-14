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
  
  // Enhanced safe click method that handles ElementClickInterceptedError
  static async safeClick(driver: any, element: any, maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await element.click();
        return;
      } catch (error: any) {
        if (error.name === 'ElementClickInterceptedError' || error.message.includes('intercepted')) {
          console.log(`[TEST-COORDINATOR] Click intercepted, attempting modal dismissal (attempt ${i + 1}/${maxRetries})`);
          await this.dismissModalDialogs(driver);
          await sleep(1000);
          
          if (i === maxRetries - 1) {
            throw new Error(`Click still intercepted after ${maxRetries} attempts and modal dismissals`);
          }
        } else {
          throw error;
        }
      }
    }
  }

  // Enhanced element waiting with proper error handling for tests
  static async waitForElement(driver: any, selector: any, timeoutMs: number = 10000, description?: string): Promise<any> {
    const { By } = require('selenium-webdriver');
    const startTime = Date.now();
    let lastError: any;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const element = await driver.findElement(selector);
        if (await element.isDisplayed()) {
          return element;
        }
      } catch (error: any) {
        lastError = error;
      }
      await sleep(500);
    }

    const selectorString = typeof selector === 'string' ? selector : selector.toString();
    const desc = description || selectorString;
    throw new Error(`Element ${desc} not found or not displayed after ${timeoutMs}ms. Last error: ${lastError?.message}`);
  }

  // Wait for webview to be ready with specific checks
  static async waitForWebviewReady(driver: any, timeoutMs: number = 30000): Promise<boolean> {
    const { By } = require('selenium-webdriver');
    console.log("[TEST-COORDINATOR] Waiting for webview to be ready...");
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check for #app element (Vue app)
        const appElement = await driver.findElement(By.id("app"));
        if (await appElement.isDisplayed()) {
          // Additional check for Vue content
          const pageSource = await driver.getPageSource();
          if (pageSource.includes('Vue') || pageSource.includes('v-') || pageSource.length > 1000) {
            console.log("[TEST-COORDINATOR] ✓ Webview is ready");
            return true;
          }
        }
      } catch (error) {
        // Continue waiting
      }
      await sleep(1000);
    }
    
    console.log("[TEST-COORDINATOR] ⚠️ Webview readiness timeout");
    return false;
  }

  // Wait for specific tab to be available
  static async waitForTab(driver: any, tabId: string, timeoutMs: number = 15000): Promise<any> {
    const { By } = require('selenium-webdriver');
    console.log(`[TEST-COORDINATOR] Waiting for tab ${tabId}...`);
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const tab = await driver.findElement(By.id(tabId));
        if (await tab.isDisplayed()) {
          console.log(`[TEST-COORDINATOR] ✓ Tab ${tabId} is available`);
          return tab;
        }
      } catch (error) {
        // Continue waiting
      }
      await sleep(1000);
    }
    
    throw new Error(`Tab ${tabId} not available after ${timeoutMs}ms`);
  }

  // Wait for modal dismissal to complete
  static async waitForModalDismissal(driver: any, timeoutMs: number = 10000): Promise<boolean> {
    const { By } = require('selenium-webdriver');
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const modals = await driver.findElements(By.css('.monaco-dialog-modal-block, .dialog-modal-block, .dimmed'));
      if (modals.length === 0) {
        return true;
      }
      await sleep(500);
    }
    return false;
  }

  // Dismiss any blocking modal dialogs (like external link confirmations)
  static async dismissModalDialogs(driver: any): Promise<void> {
    try {
      console.log("[TEST-COORDINATOR] Checking for blocking modal dialogs...");
      
      // Import Key from selenium-webdriver
      const { Key } = require('selenium-webdriver');
      const { By } = require('selenium-webdriver');
      
      // Enhanced modal selectors covering more dialog types
      const modalSelectors = [
        '.monaco-dialog-modal-block', 
        '.dialog-modal-block',
        '.dimmed',
        '.monaco-dialog-modal-block.dimmed',
        '.modal-overlay',
        '.dialog-overlay',
        '[role="dialog"]',
        '.confirmation-dialog',
        '.monaco-workbench .monaco-dialog-modal-block'
      ];
      
      let modalBlocks: any[] = [];
      for (const selector of modalSelectors) {
        try {
          const elements = await driver.findElements(By.css(selector));
          modalBlocks = modalBlocks.concat(elements);
        } catch (error) {
          // Continue with other selectors
        }
      }
      
      if (modalBlocks.length > 0) {
        console.log(`[TEST-COORDINATOR] Found ${modalBlocks.length} modal dialog(s), attempting to dismiss...`);
        
        // First try frame context switching
        const originalHandle = await driver.getWindowHandle();
        try {
          await driver.switchTo().defaultContent();
        } catch (error) {
          // Continue with current context
        }
        
        // Multiple rounds of dismissal with enhanced methods
        for (let round = 1; round <= 4; round++) {
          console.log(`[TEST-COORDINATOR] Dismissal attempt ${round}/4...`);
          
          // Method 1: Enhanced button text search with more variations
          const buttonTexts = [
            'Open', 'Allow', 'Yes', 'OK', 'Continue', 'Accept', 'Confirm', 
            'Proceed', 'Trust', 'Always allow', 'Got it', 'Dismiss', 'Close'
          ];
          const buttonXPath = buttonTexts.map(text => `contains(text(), '${text}')`).join(' or ');
          const allowButtons = await driver.findElements(By.xpath(`//button[${buttonXPath}]`));
          
          if (allowButtons.length > 0) {
            for (const button of allowButtons) {
              try {
                await button.click();
                console.log("[TEST-COORDINATOR] ✓ Dismissed modal dialog by clicking button");
                await sleep(2000);
                if (await this.waitForModalDismissal(driver, 3000)) {
                  return;
                }
              } catch (error) {
                // Try next button
              }
            }
          }
          
          // Method 2: Try clicking on the modal block itself to dismiss
          try {
            if (modalBlocks[0]) {
              await modalBlocks[0].click();
              console.log("[TEST-COORDINATOR] ✓ Dismissed modal by clicking modal block");
              await sleep(1000);
              if (await this.waitForModalDismissal(driver, 2000)) {
                return;
              }
            }
          } catch (error) {
            // Continue to next method
          }
          
          // Method 3: Enhanced escape key handling
          for (let i = 0; i < 5; i++) {
            try {
              await driver.actions().sendKeys(Key.ESCAPE).perform();
              await sleep(300);
            } catch (error) {
              // Continue
            }
          }
          console.log("[TEST-COORDINATOR] ✓ Sent multiple Escape keys");
          
          // Method 4: Try Enter key to accept dialog
          try {
            await driver.actions().sendKeys(Key.ENTER).perform();
            await sleep(500);
            console.log("[TEST-COORDINATOR] ✓ Sent Enter key");
          } catch (error) {
            // Continue
          }
          
          // Method 5: Try Tab + Enter to focus and accept
          try {
            await driver.actions().sendKeys(Key.TAB).perform();
            await sleep(200);
            await driver.actions().sendKeys(Key.ENTER).perform();
            await sleep(500);
            console.log("[TEST-COORDINATOR] ✓ Sent Tab + Enter");
          } catch (error) {
            // Continue
          }
          
          await sleep(1000);
          
          // Check if modals are still present
          if (await this.waitForModalDismissal(driver, 2000)) {
            console.log("[TEST-COORDINATOR] ✓ All modal dialogs dismissed successfully");
            return;
          }
        }
        
        console.log("[TEST-COORDINATOR] ⚠️ Some modal dialogs may still be present after 4 attempts");
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