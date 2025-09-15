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
      const By = require("vscode-extension-tester").By;
      const Key = require("selenium-webdriver").Key;
      
      console.log("[MODAL-CLEANUP] Starting comprehensive modal dismissal...");
      
      // First, switch to default content to ensure we're not in any frames
      await driver.switchTo().defaultContent();
      
      // 1. Aggressive escape key pressing
      const actions = driver.actions();
      for (let i = 0; i < 5; i++) {
        await actions.sendKeys(Key.ESCAPE).perform();
        await sleep(300);
      }
      
      // 2. Look for and dismiss the specific modal blocking overlay
      const modalOverlaySelectors = [
        ".monaco-dialog-modal-block",
        ".monaco-dialog-modal-block.dimmed",
        ".monaco-dialog.dimmed-modal",
        ".modal-overlay",
        ".dialog-overlay"
      ];
      
      for (const selector of modalOverlaySelectors) {
        try {
          const overlays = await driver.findElements(By.css(selector));
          for (const overlay of overlays) {
            if (await overlay.isDisplayed()) {
              console.log(`[MODAL-CLEANUP] Found modal overlay: ${selector}`);
              // Try clicking on the overlay to dismiss it
              await overlay.click();
              await sleep(500);
            }
          }
        } catch (error) {
          // Continue if selector not found
        }
      }
      
      // 3. Look for and click modal close buttons
      const modalCloseSelectors = [
        ".monaco-dialog .monaco-button.secondary",
        ".monaco-dialog .monaco-button:contains('Cancel')",
        ".monaco-dialog .monaco-button:contains('Close')",
        ".monaco-dialog .codicon-close",
        ".monaco-dialog .action-label.codicon.codicon-close",
        ".modal-dialog-close-btn",
        ".dialog-close-action",
        "button[aria-label*='Close']",
        "button[title*='Close']",
        ".codicon-close"
      ];
      
      for (const selector of modalCloseSelectors) {
        try {
          const elements = await driver.findElements(By.css(selector));
          for (const element of elements) {
            if (await element.isDisplayed()) {
              console.log(`[MODAL-CLEANUP] Clicking modal close button: ${selector}`);
              await element.click();
              await sleep(500);
            }
          }
        } catch (error) {
          // Continue if selector not found
        }
      }
      
      // 4. Try to dismiss any specific VS Code dialogs
      const vsCodeDialogSelectors = [
        ".monaco-dialog",
        ".quick-input-widget",
        ".notification-toast-container",
        ".monaco-workbench .part.panel"
      ];
      
      for (const selector of vsCodeDialogSelectors) {
        try {
          const dialogs = await driver.findElements(By.css(selector));
          for (const dialog of dialogs) {
            if (await dialog.isDisplayed()) {
              console.log(`[MODAL-CLEANUP] Found VS Code dialog: ${selector}`);
              // Try pressing escape while focused on the dialog
              await dialog.sendKeys(Key.ESCAPE);
              await sleep(300);
            }
          }
        } catch (error) {
          // Continue if selector not found
        }
      }
      
      // 5. Final aggressive escape sequence
      for (let i = 0; i < 3; i++) {
        await actions.sendKeys(Key.ESCAPE).perform();
        await sleep(200);
      }
      
      // 6. Force click on the main editor area to ensure focus
      try {
        const editorArea = await driver.findElement(By.css(".monaco-editor, .editor-container, .monaco-workbench"));
        if (await editorArea.isDisplayed()) {
          await editorArea.click();
          await sleep(500);
        }
      } catch (error) {
        // Continue if editor area not found
      }
      
      console.log("[MODAL-CLEANUP] Comprehensive modal dismissal completed");
    } catch (error) {
      console.log("[MODAL-CLEANUP] Error during comprehensive modal dismissal:", error);
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