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
  
  static async deepCleanUp(testName: string): Promise<void> {
    if (!this.workbench) {
      console.log(`[CLEANUP] Workbench instance not set. Skipping deep cleanup.`);
      return;
    }
    
    console.log(`[TEST-COORDINATOR] Test ${testName}: Starting deep cleanup...`);
    
    // Retry closing editors until none are left
    const maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const editorView = this.workbench.getEditorView();
        const openEditors = await editorView.getOpenEditorTitles();
        if (openEditors.length === 0) {
          console.log("✓ All editors closed successfully.");
          break; // Exit the loop if all editors are closed
        }

        console.log(`[CLEANUP] Found ${openEditors.length} open editors. Closing...`);
        await this.workbench.executeCommand("workbench.action.closeAllEditors");
        await sleep(2000); // Wait for the command to execute
        
      } catch (error) {
        console.log(`[CLEANUP] Error during editor close attempt:`, error);
        await sleep(1000); // Wait and retry
      }
      retryCount++;
    }

    if (retryCount >= maxRetries) {
      console.log("⚠️ Editor cleanup failed after multiple retries. Continuing...");
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
    
    // Add a final wait to ensure the UI is idle
    await sleep(2000);
    
    console.log(`[TEST-COORDINATOR] Test ${testName}: Deep cleanup finished.`);
  }

  static async releaseTestSlot(testName: string): Promise<void> {
    this.testCount--;
    console.log(`[TEST-COORDINATOR] Test completed: ${testName}. Remaining tests to finish: ${this.testCount}`);
    
    // Perform a comprehensive cleanup of the environment
    await this.deepCleanUp(testName);
  }
}