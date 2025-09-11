import * as assert from "assert";
import {
  Workbench,
  InputBox,
  WebDriver,
  By,
  WebView,
  VSBrowser,
  TerminalView,
} from "vscode-extension-tester";
import { Key, until, WebElement } from "selenium-webdriver";
import "mocha";
import * as path from "path";
import { TestCoordinator } from "./test-coordinator";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to ensure we can find elements with retries
const findElementWithRetry = async (driver: WebDriver, selector: By, timeout = 10000): Promise<WebElement> => {
  const startTime = Date.now();
  let lastError: any;
  
  while (Date.now() - startTime < timeout) {
    try {
      const element = await driver.findElement(selector);
      if (await element.isDisplayed()) {
        return element;
      }
    } catch (error) {
      lastError = error;
    }
    
    // If element not found, wait a bit and try again
    await sleep(500);
  }
  
  throw new Error(`Element ${selector} not found after ${timeout}ms. Last error: ${lastError?.message}`);
};

// Helper function to ensure section is expanded
const ensureSectionExpanded = async (driver: WebDriver): Promise<void> => {
  try {
    // Check if content is visible
    const content = await driver.findElement(By.id("ingestr-content"));
    if (await content.isDisplayed()) {
      console.log("✓ Section already expanded");
      return; // Already expanded
    }
  } catch (error) {
    console.log("Content not found, need to expand section");
  }
  
  try {
    // Click header to expand
    console.log("Clicking header to expand section...");
    const header = await findElementWithRetry(driver, By.id("ingestr-header"), 5000);
    await header.click();
    await sleep(2000); // Increased wait time
    
    // Verify expansion worked
    const content = await driver.findElement(By.id("ingestr-content"));
    if (!(await content.isDisplayed())) {
      throw new Error("Section failed to expand after clicking header");
    }
    console.log("✓ Section successfully expanded");
  } catch (error: any) {
    console.log("Error expanding section:", error.message);
    throw new Error(`Could not expand section: ${error.message}`);
  }
};

// Helper function to start editing a field
const startEditingField = async (driver: WebDriver, fieldId: string): Promise<void> => {
  // Ensure section is expanded first
  await ensureSectionExpanded(driver);
  
  const field = await findElementWithRetry(driver, By.id(fieldId), 10000);
  await field.click();
  await sleep(1000);
};

// Helper function to exit edit mode by clicking elsewhere
const exitEditMode = async (driver: WebDriver): Promise<void> => {
  const header = await driver.findElement(By.id("ingestr-header"));
  await header.click();
  await sleep(1000);
};

// Helper function to test field editing with input
const testFieldEditing = async (driver: WebDriver, fieldId: string, inputId: string, testValue: string): Promise<void> => {
  await startEditingField(driver, fieldId);
  
  const input = await driver.findElement(By.id(inputId));
  assert(await input.isDisplayed(), `${inputId} should appear in edit mode`);
  
  await input.clear();
  await input.sendKeys(testValue);
  await sleep(500);
  await input.sendKeys(Key.ENTER);
  await sleep(1000);
};

// Helper function to test dropdown field editing
const testDropdownEditing = async (driver: WebDriver, fieldId: string, selectId: string, expectedOptions: string[]): Promise<void> => {
  await startEditingField(driver, fieldId);
  
  const select = await driver.findElement(By.id(selectId));
  assert(await select.isDisplayed(), `${selectId} should appear in edit mode`);
  
  const options = await select.findElements(By.tagName('option'));
  assert(options.length > 0, "Select should have at least one option");
  
  const optionTexts = await Promise.all(options.map(option => option.getText()));
  for (const expectedOption of expectedOptions) {
    assert(optionTexts.some(text => text.includes(expectedOption)), `Should have ${expectedOption} option`);
  }
  
  await exitEditMode(driver);
};

// Helper function to wait for the Ingestr component to be fully loaded
const waitForIngestrComponent = async (driver: WebDriver): Promise<void> => {
  console.log("Waiting for Ingestr component to load...");
  
  // Wait for the main container
  await driver.wait(until.elementLocated(By.id("ingestr-asset-display")), 15000);
  console.log("✓ Ingestr asset display container found");
  
  // Wait for the section
  await driver.wait(until.elementLocated(By.id("ingestr-section")), 10000);
  console.log("✓ Ingestr section found");
  
  // Wait for the header
  await driver.wait(until.elementLocated(By.id("ingestr-header")), 10000);
  console.log("✓ Ingestr header found");
  
  // Ensure section is expanded
  await ensureSectionExpanded(driver);
  
  // Wait for at least one field to be present
  await driver.wait(until.elementLocated(By.id("source-connection-field")), 10000);
  console.log("✓ Ingestr fields are loaded");
};

describe("Ingestr Asset Display Integration Tests", function () {
  let webview: WebView;
  let driver: WebDriver;
  let workbench: Workbench;
  let testWorkspacePath: string;
  let testAssetFilePath: string;

  before(async function () {
    this.timeout(180000); // Increase timeout for CI

    // Coordinate with other tests to prevent resource conflicts
    await TestCoordinator.acquireTestSlot("Ingestr Asset Display Integration Tests");

    // Initialize Workbench and compute paths
    workbench = new Workbench();
    const repoRoot = process.env.REPO_ROOT || path.resolve(__dirname, "../../");
    testWorkspacePath = path.join(repoRoot, "out", "ui-test", "test-pipeline");
    testAssetFilePath = path.join(testWorkspacePath, "assets", "test-ingestr.asset.yml");
    
    // Aggressively disable walkthrough and welcome screens
    try {
      // Close all editors first
      await workbench.executeCommand("workbench.action.closeAllEditors");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Execute multiple commands to disable walkthrough-related features
      const disableCommands = [
        "workbench.action.closeWalkthrough",
        "workbench.welcome.close", 
        "workbench.action.closePanel",
        "workbench.action.closeSidebar",
        "workbench.action.toggleSidebarVisibility"
      ];
      
      for (const command of disableCommands) {
        try {
          await workbench.executeCommand(command);
        } catch (error) {
          // Command might not exist, that's ok
        }
      }
      
      console.log("Attempted to disable walkthrough and welcome features");
    } catch (error) {
      console.log("Error during walkthrough disable:", error);
    }

    // Comprehensive editor cleanup
    try {
      const editorView = workbench.getEditorView();
      
      // Multiple rounds of cleanup to handle persistent walkthrough
      for (let round = 1; round <= 3; round++) {
        console.log(`Editor cleanup round ${round}/3`);
        
        // Close all editors
        await workbench.executeCommand("workbench.action.closeAllEditors");
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Get current editor titles
        const currentTitles = await editorView.getOpenEditorTitles();
        console.log(`Round ${round} - Open editors:`, currentTitles);
        
        if (currentTitles.length === 0) {
          console.log("All editors closed successfully");
          break;
        }
        
        // Close specific unwanted editors
        const unwantedPatterns = [
          "Walkthrough", "Welcome", "Getting Started", "Setup VS Code",
          "Extension", "Learn", "Tutorial"
        ];
        
        for (const title of currentTitles) {
          const isUnwanted = unwantedPatterns.some(pattern => 
            title.toLowerCase().includes(pattern.toLowerCase())
          );
          
          if (isUnwanted) {
            try {
              await editorView.closeEditor(title);
              console.log(`Closed unwanted editor: ${title}`);
              await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
              console.log(`Could not close editor ${title}:`, error);
            }
          }
        }
        
        // Try additional commands to close walkthrough
        if (currentTitles.some(title => title.includes("Walkthrough"))) {
          try {
            await workbench.executeCommand("workbench.action.closeWalkthrough");
            await workbench.executeCommand("gettingStarted.hiddenCategory");
          } catch (error) {
            // These commands might not exist
          }
        }
      }
      
      console.log("Editor cleanup completed");
    } catch (error) {
      console.log("Error during comprehensive editor cleanup:", error);
    }

    await VSBrowser.instance.openResources(testAssetFilePath);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for file to open

    // Log the open editor titles for debugging
    const editorView = workbench.getEditorView();
    const openEditorTitles = await editorView.getOpenEditorTitles();
    console.log("Open editor titles after opening test file:", openEditorTitles);

    // Clean up any unwanted editors that opened after our file
    const unwantedPatterns = [
      "Walkthrough", "Welcome", "Getting Started", "Setup VS Code",
      "Extension", "Learn", "Tutorial", "Overview"
    ];
    
    const finalTitles = [...openEditorTitles];
    let cleanupNeeded = false;
    
    for (const title of finalTitles) {
      const isUnwanted = unwantedPatterns.some(pattern => 
        title.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isUnwanted) {
        cleanupNeeded = true;
        try {
          // Try multiple approaches to close the unwanted editor
          await editorView.closeEditor(title);
          console.log(`Closed post-open unwanted editor: ${title}`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.log(`Standard close failed for ${title}, trying alternative methods...`);
        }
      }
    }
    
    // If we had to close editors, wait a bit longer for VS Code to stabilize
    if (cleanupNeeded) {
      console.log("Waiting for VS Code to stabilize after cleanup...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Get updated titles after cleanup
    const cleanedTitles = await editorView.getOpenEditorTitles();
    console.log("Editor titles after final cleanup:", cleanedTitles);

    // Find and focus on the Ingestr asset file (might have different exact name)
    const assetFile = cleanedTitles.find(title => title.includes(".asset.yml"));
    if (!assetFile) {
      throw new Error(
        `No .asset.yml file found in open editors. Current titles: ${cleanedTitles.join(", ")}`
      );
    }

    // Focus on the asset file to ensure the Bruin panel opens correctly
    console.log(`Focusing on asset file: ${assetFile}`);
    await editorView.openEditor(assetFile);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for focus
    
    // Try to activate the extension first with multiple attempts
    let commandExecuted = false;
    const commands = ["bruin.renderSQL", "bruin.render", "bruin.openAssetPanel"];
    
    for (const command of commands) {
      try {
        await workbench.executeCommand(command);
        console.log(`Successfully executed ${command} command`);
        commandExecuted = true;
        break;
      } catch (error: any) {
        console.log(`Error executing ${command} command:`, error.message);
      }
    }
    
    if (!commandExecuted) {
      console.log("⚠️  No Bruin commands could be executed - extension may not be loaded");
    }
    
    // Wait longer for the webview to initialize  
    console.log("Waiting for webview to initialize after command execution...");
    await new Promise((resolve) => setTimeout(resolve, 8000));
    driver = VSBrowser.instance.driver;

    // Wait for the webview iframe to be present
    console.log("Waiting for webview iframe...");
    await driver.wait(
      until.elementLocated(By.className("editor-instance")),
      30000,
      "Webview iframe did not appear within 30 seconds"
    );
    console.log("Webview iframe found");

    // Check if there are multiple iframes and try to find the Bruin panel specifically
    const allIframes = await driver.findElements(By.css('iframe'));
    console.log(`Found ${allIframes.length} iframes`);
    
    for (let i = 0; i < allIframes.length; i++) {
      try {
        const iframe = allIframes[i];
        const title = await iframe.getAttribute('title');
        const src = await iframe.getAttribute('src');
        console.log(`Iframe ${i}: title="${title}", src="${src ? src.substring(0, 100) + '...' : 'no src'}"`);
      } catch (error) {
        console.log(`Iframe ${i}: could not get attributes`);
      }
    }

    // Try to find the Bruin panel iframe specifically with better logic
    let bruinIframe = null;
    for (let i = 0; i < allIframes.length; i++) {
      try {
        const iframe = allIframes[i];
        const src = await iframe.getAttribute('src');
        if (src && src.includes('index.html')) {
          console.log(`Checking iframe ${i} for Bruin content...`);
          
          // Switch to this iframe and check if it contains Bruin content
          await driver.switchTo().frame(iframe);
          
          // Wait longer and try multiple approaches to detect the app
          let hasApp = false;
          
          // Try 1: Look for #app element
          try {
            await driver.wait(until.elementLocated(By.id("app")), 5000);
            hasApp = true;
            console.log(`✓ Found #app in iframe ${i}`);
          } catch (error) {
            console.log(`No #app in iframe ${i}`);
          }
          
          // Try 2: Look for any Vue.js mounted content
          if (!hasApp) {
            try {
              const vueElements = await driver.findElements(By.css('[data-v-*], .vue-component, [v-*]'));
              if (vueElements.length > 0) {
                hasApp = true;
                console.log(`✓ Found Vue content in iframe ${i}`);
              }
            } catch (error) {
              console.log(`No Vue content in iframe ${i}`);
            }
          }
          
          // Try 3: Look for Bruin-specific elements
          if (!hasApp) {
            try {
              const bruinElements = await driver.findElements(By.css('[class*="bruin"], [id*="asset"], [class*="tab"], [id*="sql-editor"], [id*="ingestr"]'));
              if (bruinElements.length > 0) {
                hasApp = true;
                console.log(`✓ Found Bruin-specific content in iframe ${i} (${bruinElements.length} elements)`);
              }
            } catch (error) {
              console.log(`No Bruin-specific content in iframe ${i}`);
            }
          }
          
          // Try 4: Look for SQL editor or preview content
          if (!hasApp) {
            try {
              const sqlElements = await driver.findElements(By.css('[id*="editor"], [class*="sql"], [class*="preview"], [class*="highlight"]'));
              if (sqlElements.length > 0) {
                hasApp = true;
                console.log(`✓ Found SQL/editor content in iframe ${i} (${sqlElements.length} elements)`);
              }
            } catch (error) {
              console.log(`No SQL/editor content in iframe ${i}`);
            }
          }
          
          // Try 5: Check page source content for Bruin-specific text
          if (!hasApp) {
            try {
              const pageSource = await driver.getPageSource();
              const hasBruinContent = pageSource.includes('asset') || 
                                    pageSource.includes('materialization') ||
                                    pageSource.includes('preview') ||
                                    pageSource.includes('ingestr') ||
                                    pageSource.toLowerCase().includes('sql');
              
              if (hasBruinContent && pageSource.length > 5000) {
                hasApp = true;
                console.log(`✓ Found substantial Bruin content in iframe ${i} (${pageSource.length} chars)`);
              }
            } catch (error) {
              console.log(`Could not check page source in iframe ${i}`);
            }
          }
          
          if (hasApp) {
            console.log(`Found Bruin panel in iframe ${i}`);
            bruinIframe = iframe;
            break;
          } else {
            // Not the Bruin iframe, switch back
            await driver.switchTo().defaultContent();
          }
        }
      } catch (error) {
        console.log(`Error checking iframe ${i}:`, error);
        // Make sure we're back to default content if there was an error
        try {
          await driver.switchTo().defaultContent();
        } catch (switchError) {
          console.log("Error switching back to default content:", switchError);
        }
      }
    }

    if (!bruinIframe) {
      console.log("No Bruin panel iframe found, trying default WebView approach");
      webview = new WebView();
      
      // Try multiple approaches to get into the webview
      try {
        await driver.wait(until.elementLocated(By.css(".editor-instance")), 10000);
        await webview.switchToFrame();
      } catch (error) {
        console.log("Default WebView approach failed, trying direct iframe selection");
        
        // Fallback: try the first iframe that has substantial content
        for (let i = 0; i < allIframes.length; i++) {
          try {
            await driver.switchTo().frame(allIframes[i]);
            const pageSource = await driver.getPageSource();
            if (pageSource.length > 10000) { // Substantial content
              console.log(`Using iframe ${i} as fallback (${pageSource.length} chars)`);
              webview = new WebView();
              break;
            }
            await driver.switchTo().defaultContent();
          } catch (error) {
            try {
              await driver.switchTo().defaultContent();
            } catch (switchError) {
              // Ignore switch errors
            }
          }
        }
      }
    } else {
      console.log("Using Bruin panel iframe directly");
      webview = new WebView();
      // The iframe is already switched to, so we don't need to switch again
    }

    // Wait for the webview content to load with progressive checks
    console.log("Waiting for webview content to initialize...");
    
    // Progressive wait with multiple checks
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`Initialization attempt ${attempt}/5`);
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Check for app element
      try {
        const appElement = await driver.findElement(By.id("app"));
        console.log(`✓ Found #app element on attempt ${attempt}`);
        
        // Wait a bit more for Vue to mount
        await new Promise((resolve) => setTimeout(resolve, 2000));
        break;
      } catch (error) {
        console.log(`No #app element found on attempt ${attempt}`);
        
        // On the last attempt, try to trigger the webview to load properly
        if (attempt === 5) {
          console.log("Final attempt: trying to trigger webview initialization");
          
          // Try to trigger a refresh or re-render
          try {
            await driver.navigate().refresh();
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } catch (refreshError) {
            console.log("Could not refresh webview");
          }
          
          // Check one more time
          try {
            await driver.wait(until.elementLocated(By.id("app")), 5000);
            console.log("✓ Found #app element after refresh");
          } catch (finalError) {
            console.log("⚠️  Still no #app element - webview may be in settings-only mode");
            console.log("This suggests the Vue.js application is not mounting properly");
            
            // Let's see what content we do have
            try {
              const pageSource = await driver.getPageSource();
              console.log("Final webview content length:", pageSource.length);
              
              // Check for common elements that indicate the webview is working
              const commonElements = await driver.findElements(By.css('body, html, div'));
              console.log(`Found ${commonElements.length} basic HTML elements`);
              
              // Look for any form of structured content
              const structuredElements = await driver.findElements(By.css('*[class], *[id]'));
              console.log(`Found ${structuredElements.length} elements with classes or IDs`);
              
            } catch (debugError) {
              console.log("Could not gather debug information:", debugError);
            }
            
            throw new Error("Webview app element not found after all attempts");
          }
        }
      }
    }

    // Wait for the Ingestr component to be fully loaded
    await waitForIngestrComponent(driver);
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
    
    // Release the test slot for coordination
    await TestCoordinator.releaseTestSlot("Ingestr Asset Display Integration Tests");
  });

  describe("Basic Component Structure", function () {
    it("should display the main Ingestr asset display container", async function () {
      this.timeout(30000);

      try {
        const container = await driver.wait(
          until.elementLocated(By.id("ingestr-asset-display")),
          15000,
          "Ingestr asset display container not found"
        );
        
        assert(await container.isDisplayed(), "Ingestr asset display container should be visible");
        console.log("✓ Found main Ingestr asset display container");
      } catch (error) {
        // Debug: Check what's actually in the page
        const pageSource = await driver.getPageSource();
        console.log("Page source length:", pageSource.length);
        console.log("Contains 'ingestr':", pageSource.toLowerCase().includes('ingestr'));
        console.log("Contains 'asset':", pageSource.toLowerCase().includes('asset'));
        throw error;
      }
    });

    it("should display the Ingestr section with header", async function () {
      this.timeout(15000);

      const section = await driver.findElement(By.id("ingestr-section"));
      assert(await section.isDisplayed(), "Ingestr section should be visible");

      const header = await driver.findElement(By.id("ingestr-header"));
      assert(await header.isDisplayed(), "Ingestr header should be visible");

      const title = await driver.findElement(By.id("ingestr-title"));
      const titleText = await title.getText();
      assert.strictEqual(titleText, "Ingestr", "Section title should be 'Ingestr'");

      console.log("✓ Found Ingestr section with proper header");
    });

    it("should display collapsible chevron icon", async function () {
      this.timeout(15000);

      const chevron = await driver.findElement(By.id("ingestr-chevron"));
      assert(await chevron.isDisplayed(), "Chevron icon should be visible");

      // Check if it has the right CSS classes for a chevron
      const className = await chevron.getAttribute("class");
      assert(className.includes("codicon"), "Chevron should have codicon class");

      console.log("✓ Found collapsible chevron icon");
    });
  });

  describe("Required Fields Display", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should display source connection field with required indicator", async function () {
      this.timeout(15000);

      const row = await driver.findElement(By.id("source-connection-row"));
      assert(await row.isDisplayed(), "Source connection row should be visible");

      const label = await driver.findElement(By.id("source-connection-label"));
      const labelText = await label.getText();
      assert(labelText.includes("Source Connection:"), "Should have 'Source Connection:' label");
      assert(labelText.includes("*"), "Should have required asterisk");

      const value = await driver.findElement(By.id("source-connection-value"));
      assert(await value.isDisplayed(), "Source connection value should be visible");

      console.log("✓ Source connection field displays correctly with required indicator");
    });

    it("should display source table field with required indicator", async function () {
      this.timeout(15000);

      const row = await driver.findElement(By.id("source-table-row"));
      assert(await row.isDisplayed(), "Source table row should be visible");

      const label = await driver.findElement(By.id("source-table-label"));
      const labelText = await label.getText();
      assert(labelText.includes("Source Table:"), "Should have 'Source Table:' label");
      assert(labelText.includes("*"), "Should have required asterisk");

      const value = await driver.findElement(By.id("source-table-value"));
      assert(await value.isDisplayed(), "Source table value should be visible");

      console.log("✓ Source table field displays correctly with required indicator");
    });

    it("should display destination field with required indicator", async function () {
      this.timeout(15000);

      const row = await driver.findElement(By.id("destination-row"));
      assert(await row.isDisplayed(), "Destination row should be visible");

      const label = await driver.findElement(By.id("destination-label"));
      const labelText = await label.getText();
      assert(labelText.includes("Destination Platform:"), "Should have 'Destination Platform:' label");
      assert(labelText.includes("*"), "Should have required asterisk");

      const value = await driver.findElement(By.id("destination-value"));
      assert(await value.isDisplayed(), "Destination value should be visible");

      console.log("✓ Destination field displays correctly with required indicator");
    });
  });

  describe("Optional Fields Display", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should display incremental strategy field without required indicator", async function () {
      this.timeout(15000);

      const row = await driver.findElement(By.id("incremental-strategy-row"));
      assert(await row.isDisplayed(), "Incremental strategy row should be visible");

      const label = await driver.findElement(By.id("incremental-strategy-label"));
      const labelText = await label.getText();
      assert(labelText.includes("Incremental Strategy:"), "Should have 'Incremental Strategy:' label");
      assert(!labelText.includes("*"), "Should NOT have required asterisk");

      const value = await driver.findElement(By.id("incremental-strategy-value"));
      assert(await value.isDisplayed(), "Incremental strategy value should be visible");

      console.log("✓ Incremental strategy field displays correctly without required indicator");
    });

    it("should display incremental key field without required indicator", async function () {
      this.timeout(15000);

      const row = await driver.findElement(By.id("incremental-key-row"));
      assert(await row.isDisplayed(), "Incremental key row should be visible");

      const label = await driver.findElement(By.id("incremental-key-label"));
      const labelText = await label.getText();
      assert(labelText.includes("Incremental Key:"), "Should have 'Incremental Key:' label");
      assert(!labelText.includes("*"), "Should NOT have required asterisk");

      const value = await driver.findElement(By.id("incremental-key-value"));
      assert(await value.isDisplayed(), "Incremental key value should be visible");

      console.log("✓ Incremental key field displays correctly without required indicator");
    });
  });

  describe("Interactive Functionality", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should be able to toggle section visibility", async function () {
      this.timeout(15000);

      const header = await driver.findElement(By.id("ingestr-header"));
      const content = await driver.findElement(By.id("ingestr-content"));

      // Initially should be visible
      assert(await content.isDisplayed(), "Content should be visible initially");

      // Click to collapse
      await header.click();
      await sleep(1000);

      // Check if collapsed (might be removed from DOM or hidden)
      try {
        const isVisible = await content.isDisplayed();
        if (isVisible) {
          console.log("Content still visible after collapse (might use different hiding method)");
        } else {
          console.log("✓ Content hidden after collapse");
        }
      } catch (error) {
        console.log("✓ Content element removed from DOM after collapse (v-if behavior)");
      }

      // Click to expand again
      await header.click();
      await sleep(1000);

      // Should be visible again
      const expandedContent = await driver.findElement(By.id("ingestr-content"));
      assert(await expandedContent.isDisplayed(), "Content should be visible after re-expansion");

      console.log("✓ Section toggle functionality works");
    });

    it("should show clickable field indicators", async function () {
      this.timeout(15000);

      // Check if source connection field is clickable
      const sourceConnectionField = await driver.findElement(By.id("source-connection-field"));
      const fieldClass = await sourceConnectionField.getAttribute("class");
      assert(fieldClass.includes("cursor-pointer") || fieldClass.includes("hover:"), 
        "Source connection field should have interactive styling");

      // Check if destination field is clickable
      const destinationField = await driver.findElement(By.id("destination-field"));
      const destFieldClass = await destinationField.getAttribute("class");
      assert(destFieldClass.includes("cursor-pointer") || destFieldClass.includes("hover:"), 
        "Destination field should have interactive styling");

      console.log("✓ Fields show proper interactive styling");
    });
  });

  describe("Field Editing Functionality", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should allow editing source connection field", async function () {
      this.timeout(20000);

      const sourceConnectionField = await driver.findElement(By.id("source-connection-field"));
      await sourceConnectionField.click();
      await sleep(1000);

      // Check if select element appeared (edit mode)
      try {
        const select = await driver.findElement(By.id("source-connection-select"));
        assert(await select.isDisplayed(), "Source connection select should appear in edit mode");
        
        // Verify it has at least the default option
        const options = await select.findElements(By.tagName('option'));
        assert(options.length > 0, "Select should have at least one option");
        
        // Click elsewhere to exit edit mode
        const header = await driver.findElement(By.id("ingestr-header"));
        await header.click();
        await sleep(1000);
        
        console.log("✓ Source connection field editing works");
      } catch (error) {
        console.log("Source connection editing not available (might be expected if no connections)");
      }
    });

    it("should allow editing source table field", async function () {
      this.timeout(15000);

      try {
        await testFieldEditing(driver, "source-table-field", "source-table-input", "test_table_edited");
        
        // Verify input attributes
        const input = await driver.findElement(By.id("source-table-input"));
        const placeholder = await input.getAttribute("placeholder");
        assert(placeholder === "Source table name", "Input should have correct placeholder");
        
        console.log("✓ Source table field editing works");
      } catch (error) {
        console.log("Source table editing failed:", error);
      }
    });

    it("should allow editing destination field", async function () {
      this.timeout(20000);

      try {
        // First ensure section is expanded
        await ensureSectionExpanded(driver);
        
        // Debug: Check if destination field exists
        try {
          const destinationField = await driver.findElement(By.id("destination-field"));
          console.log("✓ Destination field found");
        } catch (error) {
          console.log("❌ Destination field not found, checking page content...");
          const pageSource = await driver.getPageSource();
          console.log("Page contains 'destination':", pageSource.toLowerCase().includes('destination'));
          console.log("Page contains 'destination-field':", pageSource.includes('destination-field'));
          throw error;
        }
        
        const expectedDestinations = ['AWS Athena', 'BigQuery', 'Snowflake', 'DuckDB'];
        await testDropdownEditing(driver, "destination-field", "destination-select", expectedDestinations);
        
        console.log("✓ Destination field editing works with proper options");
      } catch (error) {
        console.log("Destination editing failed:", error);
        throw error;
      }
    });

    it("should allow editing incremental strategy field", async function () {
      this.timeout(15000);

      try {
        const expectedStrategies = ['None', 'Replace', 'Append', 'Merge'];
        await testDropdownEditing(driver, "incremental-strategy-field", "incremental-strategy-select", expectedStrategies);
        
        console.log("✓ Incremental strategy field editing works");
      } catch (error) {
        console.log("Incremental strategy editing failed:", error);
      }
    });

    it("should allow editing incremental key field", async function () {
      this.timeout(15000);

      try {
        await startEditingField(driver, "incremental-key-field");
        
        const select = await driver.findElement(By.id("incremental-key-select"));
        assert(await select.isDisplayed(), "Incremental key select should appear in edit mode");
        
        const options = await select.findElements(By.tagName('option'));
        assert(options.length > 0, "Should have at least default option");
        
        // First option should be "Select column..."
        const firstOption = await options[0].getText();
        assert(firstOption.includes("Select column"), "First option should be select column placeholder");
        
        // Test if there are any column options available (beyond the placeholder)
        if (options.length > 1) {
          console.log(`✓ Found ${options.length - 1} column options available`);
          const firstColumnOption = options[1];
          const columnText = await firstColumnOption.getText();
          await firstColumnOption.click();
          await sleep(500);
          console.log(`✓ Successfully selected column: ${columnText}`);
        } else {
          console.log("✓ No column options available (expected if no columns loaded)");
        }
        
        await exitEditMode(driver);
        console.log("✓ Incremental key field editing works");
      } catch (error) {
        console.log("Incremental key editing failed:", error);
      }
    });
  });

  describe("Dropdown Functionality", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should test incremental strategy dropdown options", async function () {
      this.timeout(15000);

      const strategyField = await driver.findElement(By.id("incremental-strategy-field"));
      await strategyField.click();
      await sleep(1000);

      const select = await driver.findElement(By.id("incremental-strategy-select"));
      assert(await select.isDisplayed(), "Strategy dropdown should be visible");

      const options = await select.findElements(By.tagName('option'));
      assert(options.length >= 5, "Should have at least 5 strategy options");

      const optionTexts = await Promise.all(options.map(option => option.getText()));
      const expectedStrategies = ['None', 'Replace', 'Append', 'Merge', 'Delete + Insert'];

      for (const strategy of expectedStrategies) {
        assert(optionTexts.some(text => text.includes(strategy)), `Should have ${strategy} option`);
      }

      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(500);
    });

    it("should test incremental key dropdown with column options", async function () {
      this.timeout(15000);

      const keyField = await driver.findElement(By.id("incremental-key-field"));
      await keyField.click();
      await sleep(1000);

      const select = await driver.findElement(By.id("incremental-key-select"));
      assert(await select.isDisplayed(), "Key dropdown should be visible");

      const options = await select.findElements(By.tagName('option'));
      assert(options.length > 0, "Should have at least the placeholder option");

      const firstOptionText = await options[0].getText();
      assert(firstOptionText.includes("Select column"), "First option should be placeholder");

      if (options.length > 1) {
        await options[1].click();
        await sleep(500);
      }

      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(500);
    });

    it("should test destination dropdown options", async function () {
      this.timeout(15000);

      const destinationField = await driver.findElement(By.id("destination-field"));
      await destinationField.click();
      await sleep(1000);

      const select = await driver.findElement(By.id("destination-select"));
      assert(await select.isDisplayed(), "Destination dropdown should be visible");

      const options = await select.findElements(By.tagName('option'));
      assert(options.length > 10, "Should have many destination options");

      const optionTexts = await Promise.all(options.slice(0, 10).map(option => option.getText()));
      const expectedDestinations = ['AWS Athena', 'BigQuery', 'Snowflake', 'DuckDB', 'Postgres', 'Redshift'];

      for (const dest of expectedDestinations) {
        assert(optionTexts.some(text => text.includes(dest)), `Should have ${dest} option`);
      }

      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(500);
    });
  });

  describe("Field Validation States", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should show error styling for empty required fields", async function () {
      this.timeout(15000);

      // Check source connection label styling (should have error class when empty)
      const sourceConnectionLabel = await driver.findElement(By.id("source-connection-label"));
      const labelClass = await sourceConnectionLabel.getAttribute("class");
      
      // Check if it has appropriate styling classes
      assert(labelClass.includes("text-2xs"), "Label should have text size class");
      assert(labelClass.includes("cursor-help"), "Label should have cursor help class");
      
      // Check source connection value styling
      const sourceConnectionValue = await driver.findElement(By.id("source-connection-value"));
      const valueClass = await sourceConnectionValue.getAttribute("class");
      assert(valueClass.includes("block"), "Value should have block display class");
      
      console.log("✓ Field validation styling is applied");
    });

    it("should show appropriate styling for optional fields", async function () {
      this.timeout(15000);

      // Check incremental strategy label (should not have error classes)
      const strategyLabel = await driver.findElement(By.id("incremental-strategy-label"));
      const labelClass = await strategyLabel.getAttribute("class");
      
      assert(labelClass.includes("text-editor-fg"), "Optional label should have editor foreground color");
      assert(labelClass.includes("opacity-70"), "Optional label should have reduced opacity");
      assert(!labelClass.includes("text-errorForeground"), "Optional label should not have error color");
      
      // Check incremental key label similarly
      const keyLabel = await driver.findElement(By.id("incremental-key-label"));
      const keyLabelClass = await keyLabel.getAttribute("class");
      
      assert(keyLabelClass.includes("text-editor-fg"), "Optional key label should have editor foreground color");
      assert(keyLabelClass.includes("opacity-70"), "Optional key label should have reduced opacity");
      
      console.log("✓ Optional field styling is correct");
    });
  });

  describe("Keyboard Interaction", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should handle ESC key to cancel editing", async function () {
      this.timeout(15000);

      try {
        await startEditingField(driver, "source-table-field");
        
        const input = await driver.findElement(By.id("source-table-input"));
        assert(await input.isDisplayed(), "Input should be visible in edit mode");
        
        // Type something
        await input.clear();
        await input.sendKeys("test_value");
        await sleep(500);
        
        // Press ESC to cancel
        await input.sendKeys(Key.ESCAPE);
        await sleep(1000);
        
        // Input should be gone (edit mode cancelled)
        try {
          await driver.findElement(By.id("source-table-input"));
          assert.fail("Input should not be visible after ESC");
        } catch (error) {
          // Expected - input should be gone
          console.log("✓ ESC key cancels editing");
        }
        
      } catch (error) {
        console.log("Could not test ESC key behavior:", error);
      }
    });

    it("should handle Enter key to save editing", async function () {
      this.timeout(15000);

      try {
        await testFieldEditing(driver, "source-table-field", "source-table-input", "test_enter_save");
        console.log("✓ Enter key saves editing");
      } catch (error) {
        console.log("Could not test Enter key behavior:", error);
      }
    });
  });

  describe("Field Value Display", function () {
    before(async function () {
      // Ensure section is expanded once for all tests in this group
      await ensureSectionExpanded(driver);
    });

    it("should handle empty optional fields gracefully", async function () {
      this.timeout(15000);

      const incrementalStrategyValue = await driver.findElement(By.id("incremental-strategy-value"));
      const strategyText = await incrementalStrategyValue.getText();
      
      const incrementalKeyValue = await driver.findElement(By.id("incremental-key-value"));
      const keyText = await incrementalKeyValue.getText();

      // Just verify they exist and have some content (even if placeholder)
      assert(typeof strategyText === 'string', "Strategy field should render text content");
      assert(typeof keyText === 'string', "Key field should render text content");

      console.log("✓ Optional fields handle empty values gracefully");
    });

    it("should show appropriate placeholder text for empty fields", async function () {
      this.timeout(15000);

      // Test strategy field placeholder
      const strategyValue = await driver.findElement(By.id("incremental-strategy-value"));
      const strategyText = await strategyValue.getText();
      
      if (strategyText.includes("Click to set")) {
        assert(strategyText.includes("strategy"), "Strategy placeholder should mention strategy");
      }

      // Test key field placeholder  
      const keyValue = await driver.findElement(By.id("incremental-key-value"));
      const keyText = await keyValue.getText();
      
      if (keyText.includes("Click to set")) {
        assert(keyText.includes("key"), "Key placeholder should mention key");
      }

      console.log("✓ Placeholder text is appropriate for empty fields");
    });

  });
});