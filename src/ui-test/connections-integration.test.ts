import * as assert from "assert";
import {
  Workbench,
  WebDriver,
  By,
  WebView,
  VSBrowser,
} from "vscode-extension-tester";
import { until } from "selenium-webdriver";
import "mocha";
import * as path from "path";
import { TestCoordinator } from "./test-coordinator";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Connections Integration Test", function () {
  let driver: WebDriver;
  let webview: WebView;
  let workbench: Workbench;
  let testWorkspacePath: string;
  let testFilePath: string;

  before(async function () {
    this.timeout(180000);

    // Coordinate with other tests
    await TestCoordinator.acquireTestSlot("Connections Integration Test");

    // Initialize Workbench and compute paths
    workbench = new Workbench();
    const repoRoot = process.env.REPO_ROOT || path.resolve(__dirname, "../../");
    testWorkspacePath = path.join(repoRoot, "out", "ui-test", "test-pipeline");
    testFilePath = path.join(testWorkspacePath, ".bruin.yml");
    
    // Aggressive editor cleanup to handle walkthrough
    try {
      // Wait for VS Code to initialize
      await sleep(2000);
      
      // Close all editors first
      await workbench.executeCommand("workbench.action.closeAllEditors");
      await sleep(1000);
      
      // Try specific commands to close walkthrough
      const disableCommands = [
        "workbench.action.closeWalkthrough",
        "workbench.welcome.close", 
        "gettingStarted.hideCategory",
        "workbench.action.closePanel",
        "workbench.action.closeSidebar"
      ];
      
      for (const command of disableCommands) {
        try {
          await workbench.executeCommand(command);
          await sleep(200);
        } catch (error) {
          // Command might not exist, that's ok
        }
      }
      
      // Close all editors again to catch any that opened
      await workbench.executeCommand("workbench.action.closeAllEditors");
      await sleep(1000);
      
      console.log("Completed aggressive editor cleanup");
    } catch (error) {
      console.log("Error during editor cleanup:", error);
    }

    // Open the .bruin.yml file
    await VSBrowser.instance.openResources(testFilePath);
    await sleep(3000);

    // Verify the file opened and clean up any unwanted editors
    const editorView = workbench.getEditorView();
    let openEditorTitles = await editorView.getOpenEditorTitles();
    console.log("Open editor titles after opening file:", openEditorTitles);
    
    // Close any unwanted editors that might have opened
    const unwantedPatterns = [
      "Walkthrough", "Welcome", "Getting Started", "Setup VS Code",
      "Extension", "Learn", "Tutorial", "Overview"
    ];
    
    for (const title of openEditorTitles) {
      const isUnwanted = unwantedPatterns.some(pattern => 
        title.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isUnwanted) {
        try {
          await editorView.closeEditor(title);
          console.log(`Closed unwanted editor: ${title}`);
          await sleep(200);
        } catch (error) {
          console.log(`Could not close editor ${title}:`, error);
        }
      }
    }
    
    // Get updated titles after cleanup
    openEditorTitles = await editorView.getOpenEditorTitles();
    console.log("Open editor titles after cleanup:", openEditorTitles);
    
    const bruinFile = openEditorTitles.find(title => title.includes(".bruin.yml"));
    if (!bruinFile) {
      throw new Error(`No .bruin.yml file found. Current titles: ${openEditorTitles.join(", ")}`);
    }

    // Focus on the .bruin.yml file
    console.log(`Focusing on .bruin.yml file: ${bruinFile}`);
    await editorView.openEditor(bruinFile);
    await sleep(2000);
    
    // Execute the bruin.renderSQL command
    try {
      await workbench.executeCommand("bruin.renderSQL");
      console.log("Successfully executed bruin.renderSQL command");
    } catch (error: any) {
      console.log("Error executing bruin.renderSQL command:", error.message);
      throw new Error("bruin.renderSQL command could not be executed");
    }
    
    // Wait for the webview to initialize
    console.log("Waiting for webview to initialize...");
    await sleep(8000);
    driver = VSBrowser.instance.driver;

    // Wait for the webview iframe
    console.log("Waiting for webview iframe...");
    await driver.wait(
      until.elementLocated(By.className("editor-instance")),
      30000,
      "Webview iframe did not appear within 30 seconds"
    );
    console.log("Webview iframe found");

    // Find the Bruin panel iframe
    const allIframes = await driver.findElements(By.css('iframe'));
    console.log(`Found ${allIframes.length} iframes`);
    
    let bruinIframe = null;
    for (let i = 0; i < allIframes.length; i++) {
      try {
        const iframe = allIframes[i];
        const src = await iframe.getAttribute('src');
        if (src && src.includes('index.html')) {
          console.log(`Checking iframe ${i} for Bruin content...`);
          
          await driver.switchTo().frame(iframe);
          
          // Look for #app element
          try {
            await driver.wait(until.elementLocated(By.id("app")), 5000);
            console.log(`✓ Found #app in iframe ${i}`);
            bruinIframe = iframe;
            break;
          } catch (error) {
            console.log(`No #app in iframe ${i}`);
            await driver.switchTo().defaultContent();
          }
        }
      } catch (error) {
        console.log(`Error checking iframe ${i}:`, error);
        try {
          await driver.switchTo().defaultContent();
        } catch (switchError) {
          // Ignore
        }
      }
    }

    if (!bruinIframe) {
      console.log("No Bruin panel iframe found, using default WebView approach");
      webview = new WebView();
      await webview.switchToFrame();
    } else {
      console.log("Using Bruin panel iframe directly");
      webview = new WebView();
    }

    // Wait for webview content to load
    console.log("Waiting for webview content to initialize...");
    await sleep(3000);
    
    // Check for app element
    try {
      await driver.wait(until.elementLocated(By.id("app")), 10000);
      console.log("✓ Found #app element");
    } catch (error) {
      console.log("No #app element found, but continuing...");
    }

    console.log("✓ Connections webview initialized successfully");
  });

  after(async function () {
    // Switch back to default content
    if (driver) {
      try {
        await driver.switchTo().defaultContent();
      } catch (error) {
        console.log("Error switching back to default content:", error);
      }
    }
    
    // Release the test slot
    await TestCoordinator.releaseTestSlot("Connections Integration Test");
  });

  describe("Connections UI Integration", function () {
    it("should open connections UI via render sql command", async function () {
      this.timeout(60000);

      // Look for the settings tab - this should be the first tab
      try {
        const settingsTab = await driver.findElement(By.id("tab-0"));
        console.log("✓ Found settings tab");
        
        // Click on the settings tab to ensure it's active
        await settingsTab.click();
        await sleep(1000);
        console.log("✓ Clicked on settings tab");
        
        // Look for any connection-related content in the settings tab
        const connectionElements = await driver.findElements(By.css('[id*="connection"], [class*="connection"], [id*="environment"], [class*="environment"]'));
        console.log(`Found ${connectionElements.length} connection-related elements`);
        
        if (connectionElements.length > 0) {
          console.log("✓ Found connection content in settings tab");
        } else {
          console.log("No specific connection elements found, but settings tab is loaded");
        }
        
      } catch (error) {
        console.log("Could not find settings tab:", error);
        throw error;
      }

      console.log("✓ Connections UI opened successfully via render sql command");
    });

    it("should display settings tab with basic content", async function () {
      this.timeout(30000);

      // Just verify we can find some basic elements in the webview
      try {
        const appElement = await driver.findElement(By.id("app"));
        assert(await appElement.isDisplayed(), "App element should be visible");
        console.log("✓ App element is visible");
        
        // Look for any tab elements
        const tabs = await driver.findElements(By.css('[id*="tab"]'));
        console.log(`Found ${tabs.length} tabs`);
        
        if (tabs.length > 0) {
          console.log("✓ Found tab elements");
        }
        
      } catch (error) {
        console.log("Could not find basic elements:", error);
        throw error;
      }

      console.log("✓ Settings tab displays basic content");
    });
  });
});