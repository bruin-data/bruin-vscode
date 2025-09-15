// test-coordinator.ts

import { Workbench } from "vscode-extension-tester";
import { TimeoutError } from "selenium-webdriver/lib/error";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TestCoordinator {
  private static testCount = 0;
  private static readonly TEST_ISOLATION_DELAY = 8000;
  private static workbench: Workbench | null = null;
  
  static setWorkbench(workbench: Workbench) {
    this.workbench = workbench;
  }
  
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
  
  static async dismissModalDialogs(): Promise<void> {
    try {
      const driver = require("vscode-extension-tester").VSBrowser.instance.driver;
      
      // Try to dismiss any modal dialogs by pressing Escape multiple times
      const actions = driver.actions();
      for (let i = 0; i < 3; i++) {
        await actions.sendKeys(require("selenium-webdriver").Key.ESCAPE).perform();
        await sleep(500);
      }
      
      // Try clicking on modal dismiss buttons
      const modalSelectors = [
        ".monaco-dialog .monaco-button.secondary",
        ".monaco-dialog .codicon-close",
        ".modal-dialog-close-btn",
        ".action-label.icon.codicon.codicon-close"
      ];
      
      for (const selector of modalSelectors) {
        try {
          const elements = await driver.findElements(require("vscode-extension-tester").By.css(selector));
          for (const element of elements) {
            if (await element.isDisplayed()) {
              await element.click();
              await sleep(500);
            }
          }
        } catch (error) {
          // Ignore if selector not found
        }
      }
    } catch (error) {
      console.log("[MODAL-CLEANUP] Error dismissing modals:", error);
    }
  }

  static async deepCleanUp(testName: string): Promise<void> {
    if (!this.workbench) {
      console.log(`[CLEANUP] Workbench instance not set. Skipping deep cleanup.`);
      return;
    }
    
    console.log(`[TEST-COORDINATOR] Test ${testName}: Starting deep cleanup...`);
    
    // First, try to dismiss any modal dialogs
    await this.dismissModalDialogs();
    await sleep(1000);
    
    // Close all editors aggressively
    const closeCommands = [
      "workbench.action.closeAllEditors",
      "workbench.action.closeOtherEditors", 
      "workbench.action.closeEditorsInGroup"
    ];
    
    for (const command of closeCommands) {
      try {
        await this.workbench.executeCommand(command);
        await sleep(1000);
      } catch (error) {
        console.log(`[CLEANUP] Command ${command} failed:`, error);
      }
    }
    
    // Attempt to close any remaining walkthrough or welcome screens
    const disableCommands = [
      "workbench.action.closeWalkthrough",
      "workbench.welcome.close",
      "gettingStarted.hideCategory",
      "workbench.action.closePanel",
      "workbench.action.closeSidebar",
      "workbench.action.closeAuxiliaryBar"
    ];
    
    for (const command of disableCommands) {
      try {
        await this.workbench.executeCommand(command);
        await sleep(200);
      } catch (error) {
        // Ignore errors if the command doesn't exist or fails
      }
    }
    
    // Final modal dismissal attempt
    await this.dismissModalDialogs();
    
    // Add a final wait to ensure the UI is idle
    await sleep(3000);
    
    console.log(`[TEST-COORDINATOR] Test ${testName}: Deep cleanup finished.`);
  }

  static async releaseTestSlot(testName: string): Promise<void> {
    this.testCount--;
    console.log(`[TEST-COORDINATOR] Test completed: ${testName}. Remaining tests to finish: ${this.testCount}`);
    
    // Perform a comprehensive cleanup of the environment
    await this.deepCleanUp(testName);
  }
}