/**
 * Simple test coordination to prevent resource conflicts when running multiple UI tests
 */
import { Workbench } from "vscode-extension-tester";

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
   * Aggressively clean all open editors and reset VS Code state
   */
  static async performDeepCleanup(): Promise<void> {
    try {
      const workbench = new Workbench();
      
      console.log("[TEST-COORDINATOR] Starting deep cleanup...");
      
      // Close all editors multiple times to handle stubborn tabs
      for (let i = 0; i < 3; i++) {
        await workbench.executeCommand("workbench.action.closeAllEditors");
        await sleep(500);
      }
      
      // Close panels and sidebars
      const cleanupCommands = [
        "workbench.action.closePanel",
        "workbench.action.closeSidebar",
        "workbench.action.closeAuxiliaryBar",
        "workbench.action.closeWalkthrough",
        "workbench.welcome.close",
        "gettingStarted.hideCategory"
      ];
      
      for (const command of cleanupCommands) {
        try {
          await workbench.executeCommand(command);
          await sleep(200);
        } catch (error) {
          // Command might not exist, ignore
        }
      }
      
      // Final editor check and forced cleanup
      const editorView = workbench.getEditorView();
      const remainingTitles = await editorView.getOpenEditorTitles();
      
      if (remainingTitles.length > 0) {
        console.log(`[TEST-COORDINATOR] Force closing ${remainingTitles.length} remaining editors:`, remainingTitles);
        
        for (const title of remainingTitles) {
          try {
            await editorView.closeEditor(title);
            await sleep(200);
          } catch (error) {
            console.log(`[TEST-COORDINATOR] Could not close ${title}:`, error);
          }
        }
      }
      
      console.log("[TEST-COORDINATOR] Deep cleanup completed");
    } catch (error) {
      console.log("[TEST-COORDINATOR] Error during deep cleanup:", error);
    }
  }

  static async releaseTestSlot(testName: string): Promise<void> {
    this.testCount--;
    console.log(`[TEST-COORDINATOR] Test completed: ${testName}. Remaining tests to finish: ${this.testCount}`);
    
    // Perform deep cleanup after each test
    await this.performDeepCleanup();
    
    // Add a delay to ensure cleanup operations complete
    await sleep(2000);
  }
}