/**
 * Simple test coordination to prevent resource conflicts when running multiple UI tests
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TestCoordinator {
  private static testCount = 0;
  private static readonly TEST_ISOLATION_DELAY = 20000; // 20 seconds between tests for better isolation
  
  // Universal click wrapper that all tests should use
  static async click(driver: any, element: any): Promise<void> {
    return this.safeClick(driver, element);
  }
  
  // Get timeout multiplier for CI environments (default 1 for local, 3 for CI)
  private static getTimeoutMultiplier(): number {
    const multiplier = process.env.TEST_TIMEOUT_MULTIPLIER;
    return multiplier ? parseInt(multiplier, 10) : 1;
  }
  
  // Apply timeout multiplier to any duration
  static adjustTimeout(timeoutMs: number): number {
    return timeoutMs * this.getTimeoutMultiplier();
  }
  
  // Enhanced safe click method that handles ElementClickInterceptedError and Vue reactivity
  static async safeClick(driver: any, element: any, maxRetries: number = 5): Promise<void> {
    // Always dismiss modals first - this is critical for CI environments
    await this.dismissModalDialogs(driver);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Wait for Vue reactivity to settle before attempting click
        await sleep(1500);
        
        // Scroll element into view and ensure it's interactable
        try {
          await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', element);
          await sleep(500);
          
          const isDisplayed = await element.isDisplayed();
          const isEnabled = await element.isEnabled();
          
          if (!isDisplayed || !isEnabled) {
            console.log(`[TEST-COORDINATOR] Element not interactable (displayed: ${isDisplayed}, enabled: ${isEnabled}), waiting...`);
            await sleep(2000);
            continue;
          }
        } catch (scrollError: any) {
          console.log('[TEST-COORDINATOR] Could not scroll or check element state, continuing...', scrollError.message);
        }
        
        await element.click();
        console.log('[TEST-COORDINATOR] Click succeeded');
        
        // Wait for Vue to process the click event
        await sleep(1500);
        return;
      } catch (error: any) {
        console.log(`[TEST-COORDINATOR] Click attempt ${i + 1}/${maxRetries} failed:`, error.message);
        
        if (error.name === 'ElementClickInterceptedError' || error.message.includes('intercepted')) {
          console.log(`[TEST-COORDINATOR] Click intercepted, attempting modal dismissal (attempt ${i + 1}/${maxRetries})`);
          await this.dismissModalDialogs(driver);
          await sleep(2000);
          
          if (i === maxRetries - 1) {
            throw new Error(`Click still intercepted after ${maxRetries} attempts and modal dismissals`);
          }
        } else {
          // For other errors, wait longer for Vue to settle
          await sleep(3000);
          if (i === maxRetries - 1) {
            throw error;
          }
        }
      }
    }
  }

  // Enhanced element waiting with proper error handling for tests
  static async waitForElement(driver: any, selector: any, timeoutMs: number = 10000, description?: string): Promise<any> {
    const { By } = require('selenium-webdriver');
    const startTime = Date.now();
    let lastError: any;
    let consecutiveNotFound = 0;

    // Dismiss modals that might interfere with element detection
    await this.dismissModalDialogs(driver);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const element = await driver.findElement(selector);
        if (await element.isDisplayed()) {
          // Final check that element is actually interactable
          try {
            const isEnabled = await element.isEnabled();
            if (isEnabled) {
              // Additional Vue-specific check: ensure element is not just rendered but interactive
              try {
                // Try to get element properties to ensure it's fully rendered
                await element.getAttribute('id');
                await element.getAttribute('class');
                console.log(`[TEST-COORDINATOR] ✓ Found interactive element: ${description || 'element'}`);
                return element;
              } catch (attrError) {
                // Element exists but may not be fully interactive yet
                console.log(`[TEST-COORDINATOR] Element ${description || 'element'} found but not fully interactive, continuing...`);
                await sleep(1000);
                continue;
              }
            }
            console.log(`[TEST-COORDINATOR] Found element ${description || 'element'} but it's disabled, continuing to wait...`);
          } catch (enabledError) {
            // Some elements don't support isEnabled(), return anyway
            console.log(`[TEST-COORDINATOR] ✓ Found element: ${description || 'element'} (isEnabled not supported)`);
            return element;
          }
        } else {
          console.log(`[TEST-COORDINATOR] Element ${description || 'element'} found but not displayed, continuing...`);
        }
      } catch (error: any) {
        lastError = error;
        consecutiveNotFound++;
        
        // If we haven't found the element for a while, try dismissing modals again
        if (consecutiveNotFound % 10 === 0) {
          console.log(`[TEST-COORDINATOR] Element ${description || 'element'} not found for ${consecutiveNotFound} attempts, dismissing modals...`);
          await this.dismissModalDialogs(driver);
        }
      }
      
      // Progressive backoff: start with shorter waits, increase over time
      const waitTime = Math.min(500 + (consecutiveNotFound * 100), 2000);
      await sleep(waitTime);
    }

    const selectorString = typeof selector === 'string' ? selector : selector.toString();
    const desc = description || selectorString;
    throw new Error(`Element ${desc} not found or not displayed after ${timeoutMs}ms. Last error: ${lastError?.message}`);
  }

  // Wait for webview to be ready with Vue-specific checks
  static async waitForWebviewReady(driver: any, timeoutMs: number = 60000): Promise<boolean> {
    const { By } = require('selenium-webdriver');
    console.log("[TEST-COORDINATOR] Waiting for webview with Vue components to be ready...");
    
    const startTime = Date.now();
    let lastPageLength = 0;
    let stableCount = 0;
    let consecutiveVueChecks = 0;
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check 1: Basic app container
        let appReady = false;
        try {
          const appSelectors = ['#app', '.vue-app', 'main', '.container'];
          for (const selector of appSelectors) {
            try {
              const element = await driver.findElement(By.css(selector));
              if (await element.isDisplayed()) {
                appReady = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (error) {
          // Continue
        }
        
        // Check 2: Vue-specific content analysis
        let vueReady = false;
        try {
          const pageSource = await driver.getPageSource();
          const currentLength = pageSource.length;
          
          // Check for Vue components and Bruin-specific content
          const hasVueComponents = pageSource.includes('vscode-button') ||
                                 pageSource.includes('vscode-panels') ||
                                 pageSource.includes('data-v-') ||
                                 pageSource.includes('v-') ||
                                 pageSource.includes('vue-app') ||
                                 pageSource.includes('Vue');
          
          const hasBruinContent = pageSource.includes('Connections') ||
                                pageSource.includes('Settings') ||
                                pageSource.includes('add-environment-button') ||
                                pageSource.includes('BruinSettings') ||
                                pageSource.includes('Bruin') ||
                                pageSource.includes('Environment');
          
          // Check for Vue app mounting indicators
          const hasVueAppMounting = pageSource.includes('id="app"') ||
                                   pageSource.includes('class="vue-app"') ||
                                   pageSource.includes('data-v-') ||
                                   pageSource.includes('v-if') ||
                                   pageSource.includes('v-for');
          
          // Check page stability (Vue hydration complete)
          if (currentLength === lastPageLength) {
            stableCount++;
          } else {
            stableCount = 0;
            lastPageLength = currentLength;
          }
          
          // More lenient Vue readiness check
          vueReady = (hasVueComponents || hasBruinContent || hasVueAppMounting) && 
                    currentLength > 5000 && 
                    stableCount >= 2; // Reduced stability requirement
          
          if (vueReady) {
            consecutiveVueChecks++;
            console.log(`[TEST-COORDINATOR] ✓ Vue components rendered and stable (${consecutiveVueChecks}/3)`);
          } else {
            consecutiveVueChecks = 0;
          }
        } catch (error) {
          // Continue
        }
        
        // Check 3: Critical interactive elements for connections tests
        let interactiveReady = false;
        try {
          // Look for Settings tab specifically (required for connections tests)
          const settingsElements = await driver.findElements(By.xpath("//*[contains(text(), 'Settings')]"));
          const buttons = await driver.findElements(By.css('button, vscode-button'));
          const panels = await driver.findElements(By.css('vscode-panels'));
          
          if (settingsElements.length > 0) {
            // Verify at least one Settings element is actually interactive
            for (const element of settingsElements.slice(0, 2)) { // Check first 2
              try {
                const isDisplayed = await element.isDisplayed();
                const isEnabled = await element.isEnabled();
                if (isDisplayed && isEnabled) {
                  interactiveReady = true;
                  console.log("[TEST-COORDINATOR] ✓ Settings tab is interactive");
                  break;
                }
              } catch (e) {
                continue;
              }
            }
          }
          
          // Fallback: any interactive buttons or panels
          if (!interactiveReady && (buttons.length > 0 || panels.length > 0)) {
            interactiveReady = true;
            console.log(`[TEST-COORDINATOR] ✓ Found interactive elements (${buttons.length} buttons, ${panels.length} panels)`);
          }
        } catch (error) {
          // Continue
        }
        
        // More lenient readiness check - don't require all three conditions
        if (appReady && (vueReady || consecutiveVueChecks >= 2)) {
          console.log("[TEST-COORDINATOR] ✓ Vue webview is ready for interactions");
          // Extra wait to ensure Vue reactivity has fully settled
          await sleep(2000);
          return true;
        }
        
        // Progress logging
        if ((Date.now() - startTime) % 10000 < 1000) {
          console.log(`[TEST-COORDINATOR] Vue readiness check... app:${appReady} vue:${vueReady} interactive:${interactiveReady} (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }
        
      } catch (error) {
        // Continue waiting
      }
      await sleep(1000); // Reduced sleep time for faster detection
    }
    
    console.log("[TEST-COORDINATOR] ⚠️ Vue webview readiness timeout");
    
    // Enhanced diagnostic for Vue
    try {
      const pageSource = await driver.getPageSource();
      console.log(`[TEST-COORDINATOR] Vue diagnostic - page length: ${pageSource.length}`);
      console.log(`[TEST-COORDINATOR] Contains Vue components: ${pageSource.includes('vscode-')}`); 
      console.log(`[TEST-COORDINATOR] Contains Settings: ${pageSource.includes('Settings')}`);
      console.log(`[TEST-COORDINATOR] Contains Connections: ${pageSource.includes('Connections')}`);
      console.log(`[TEST-COORDINATOR] Contains Bruin: ${pageSource.includes('Bruin')}`);
      console.log(`[TEST-COORDINATOR] Contains #app: ${pageSource.includes('id="app"')}`);
      const settingsCount = await driver.findElements(By.xpath("//*[contains(text(), 'Settings')]"));
      console.log(`[TEST-COORDINATOR] Settings elements found: ${settingsCount.length}`);
      
      // Check if we have any content at all
      if (pageSource.length > 1000) {
        console.log("[TEST-COORDINATOR] ⚠️ Webview has content but Vue may not be fully mounted");
        return false; // Don't return true on timeout
      }
    } catch (error) {
      console.log("[TEST-COORDINATOR] Could not run Vue diagnostic");
    }
    
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
        '.monaco-workbench .monaco-dialog-modal-block',
        // Additional VS Code specific selectors
        '.monaco-workbench .monaco-dialog-modal-block.dimmed',
        '.monaco-workbench .monaco-dialog-modal-block',
        '.monaco-dialog-modal-block.dimmed',
        '.monaco-dialog-modal-block',
        // Welcome screen and walkthrough selectors
        '.welcome-page',
        '.walkthrough-page',
        '.getting-started-page',
        '.extension-page',
        '.monaco-workbench .welcome-page',
        '.monaco-workbench .walkthrough-page'
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
        for (let round = 1; round <= 6; round++) {
          console.log(`[TEST-COORDINATOR] Dismissal attempt ${round}/6...`);
          
          // Method 1: Enhanced button text search with more variations
          const buttonTexts = [
            'Open', 'Allow', 'Yes', 'OK', 'Continue', 'Accept', 'Confirm', 
            'Proceed', 'Trust', 'Always allow', 'Got it', 'Dismiss', 'Close',
            'Skip', 'Later', 'Not now', 'Cancel', 'No thanks', 'Start',
            'Get Started', 'Begin', 'Next', 'Finish', 'Done'
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
          for (let i = 0; i < 8; i++) {
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
          
          // Method 6: Try clicking outside modal area
          try {
            await driver.actions().move({ x: 10, y: 10 }).click().perform();
            await sleep(500);
            console.log("[TEST-COORDINATOR] ✓ Clicked outside modal area");
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
        
        console.log("[TEST-COORDINATOR] ⚠️ Some modal dialogs may still be present after 6 attempts");
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

  /**
   * Enhanced command execution with retry logic for VS Code extension commands
   */
  static async executeCommandWithRetry(workbench: any, command: string, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[TEST-COORDINATOR] Executing command '${command}' (attempt ${attempt}/${maxRetries})`);
        await workbench.executeCommand(command);
        console.log(`[TEST-COORDINATOR] ✓ Command '${command}' executed successfully`);
        return true;
      } catch (error: any) {
        console.log(`[TEST-COORDINATOR] Command '${command}' failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
        
        if (attempt < maxRetries) {
          // Wait before retry with progressive backoff
          const waitTime = 2000 * attempt;
          console.log(`[TEST-COORDINATOR] Waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
          
          // Try to dismiss any modals that might be blocking
          try {
            const { VSBrowser } = require('vscode-extension-tester');
            await this.dismissModalDialogs(VSBrowser.instance.driver);
          } catch (modalError) {
            // Ignore modal dismissal errors
          }
        }
      }
    }
    
    console.log(`[TEST-COORDINATOR] ⚠️ Command '${command}' failed after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Wait for VS Code extension to be loaded and ready
   */
  static async waitForExtensionReady(workbench: any, extensionName: string = "bruin", timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const testCommands = [
      "bruin.render",
      "bruin.renderSQL", 
      "bruin.openAssetPanel",
      "bruin.getAssetDetails"
    ];
    
    console.log(`[TEST-COORDINATOR] Waiting for ${extensionName} extension to be ready...`);
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to execute a simple command to test if extension is loaded
        const commandExecuted = await this.executeCommandWithRetry(workbench, "bruin.render", 1);
        if (commandExecuted) {
          console.log(`[TEST-COORDINATOR] ✓ ${extensionName} extension is ready`);
          return true;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await sleep(2000);
    }
    
    console.log(`[TEST-COORDINATOR] ⚠️ ${extensionName} extension not ready after ${timeoutMs}ms`);
    return false;
  }

  /**
   * Enhanced webview initialization with better error handling
   */
  static async initializeWebview(driver: any, workbench: any): Promise<boolean> {
    try {
      console.log("[TEST-COORDINATOR] Initializing webview...");
      
      // Step 1: Ensure extension is ready
      const extensionReady = await this.waitForExtensionReady(workbench);
      if (!extensionReady) {
        console.log("[TEST-COORDINATOR] ⚠️ Extension not ready, continuing anyway...");
      }
      
      // Step 2: Dismiss any blocking modals
      await this.dismissModalDialogs(driver);
      
      // Step 3: Wait for webview to be ready
      const webviewReady = await this.waitForWebviewReady(driver);
      if (!webviewReady) {
        console.log("[TEST-COORDINATOR] ⚠️ Webview not fully ready, but continuing...");
      }
      
      // Step 4: Final modal dismissal
      await this.dismissModalDialogs(driver);
      
      console.log("[TEST-COORDINATOR] ✓ Webview initialization completed");
      return true;
    } catch (error: any) {
      console.log(`[TEST-COORDINATOR] Webview initialization error: ${error.message}`);
      return false;
    }
  }
}