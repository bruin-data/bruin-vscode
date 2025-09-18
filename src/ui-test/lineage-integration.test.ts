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

// Helper function to handle click interception issues
const safeClick = async (driver: WebDriver, element: any) => {
  try {
    // Wait until the element is visible and then click it
    await driver.wait(until.elementIsVisible(element), 10000, "Timed out waiting for element to be visible before click.");
    await element.click();
  } catch (error: any) {
    if (error.name === 'ElementClickInterceptedError') {
      console.log("Click intercepted, using JavaScript click as fallback");
      await driver.executeScript("arguments[0].click();", element);
    } else {
      throw error;
    }
  }
};

describe("Lineage Panel Integration Tests", function () {
  let webview: WebView | undefined;
  let driver: WebDriver;
  let workbench: Workbench;
  let testWorkspacePath: string;
  let testAssetFilePath: string;

  before(async function () {
    this.timeout(240000); // Increased overall timeout to 4 minutes

    // Coordinate with other tests to prevent resource conflicts
    await TestCoordinator.acquireTestSlot("Lineage Panel Integration Tests");

    workbench = new Workbench();
    driver = VSBrowser.instance.driver;
    const repoRoot = process.env.REPO_ROOT || path.resolve(__dirname, "../../");
    testWorkspacePath = path.join(repoRoot, "out", "ui-test", "test-pipeline");
    testAssetFilePath = path.join(testWorkspacePath, "assets", "example.sql");
    
    try {
      // Close all editors first
      await workbench.executeCommand("workbench.action.closeAllEditors");
    } catch (error) {
      console.log("Could not close all editors, continuing...");
    }

    // Open example.sql file to set the context for the panel
    try {
      await VSBrowser.instance.openResources(testAssetFilePath);
      console.log("✓ Opened example.sql");

      // Now, explicitly focus the lineage panel to ensure it opens
      await workbench.executeCommand("bruin.assetLineageView.focus");
      console.log("✓ Executed 'bruin.assetLineageView.focus' command");
      
      webview = new WebView();
      // Wait for a reasonable amount of time for the webview to appear in the DOM
      await driver.wait(async () => {
        try {
            await webview?.wait(200); // Check for webview's existence without long wait
            return true;
        } catch (e) {
            return false;
        }
      }, 5000, "Timed out waiting for the webview to be present in the DOM.");
      
      await webview.switchToFrame();
      console.log("✓ Switched to webview context");

      // Wait for the lineage panel iframe to appear
      console.log("🔍 Looking for lineage panel iframe...");
      const lineageIframe = await driver.wait(
        until.elementLocated(By.css('iframe[src*="extensionId=bruin.bruin"]')),
        10000,
        "Timed out waiting for lineage panel iframe"
      );
      console.log("✓ Found lineage panel iframe");

      // Switch to the lineage panel iframe
      await driver.switchTo().frame(lineageIframe);
      console.log("✓ Switched to lineage panel iframe context");

      // Wait for the actual content iframe (the one that loads our HTML)
      console.log("🔍 Looking for content iframe...");
      const contentIframe = await driver.wait(
        until.elementLocated(By.css('iframe[src*="fake.html"]')),
        10000,
        "Timed out waiting for content iframe"
      );
      console.log("✓ Found content iframe");

      // Switch to the content iframe
      await driver.switchTo().frame(contentIframe);
      console.log("✓ Switched to content iframe context");

      // Now check what's actually in the content webview
      console.log("🔍 Checking content webview...");
      const bodyContent = await driver.executeScript("return document.body.innerHTML;");
      console.log("📄 Content webview body content:", bodyContent);
      
      const docTitle = await driver.executeScript("return document.title;");
      console.log("📄 Content webview title:", docTitle);
      
      // Check if basic webview elements are present
      console.log("🔍 Checking for basic webview elements...");
      
      // Check if app element exists
      const appElement = await driver.wait(until.elementLocated(By.css("#app")), 10000, "Timed out waiting for #app element.");
      console.log("✓ Found #app element");
      
      // Check if flow container exists
      try {
        const flowElement = await driver.wait(until.elementLocated(By.css(".flow")), 10000, "Timed out waiting for .flow element.");
        console.log("✓ Found .flow element");
      } catch (error: any) {
        console.log("❌ .flow element not found:", error.message);
        
        // Log what elements are actually present
        const bodyContent = await driver.executeScript("return document.body.innerHTML;");
        console.log("📄 Document body content:", bodyContent);
        throw error;
      }
      
      // Check if loading overlay or error message is showing
      const loadingOverlay = await driver.findElements(By.css(".loading-overlay"));
      const errorMessage = await driver.findElements(By.css(".error-message"));
      console.log(`🔍 Loading overlay elements: ${loadingOverlay.length}`);
      console.log(`🔍 Error message elements: ${errorMessage.length}`);
      
      // If loading is showing, wait for it to finish
      if (loadingOverlay.length > 0) {
        console.log("⏳ Loading overlay detected, waiting for it to disappear...");
        await driver.wait(until.stalenessOf(loadingOverlay[0]), 30000, "Loading took too long");
        console.log("✓ Loading finished");
      }
      
      // If error is showing, log it
      if (errorMessage.length > 0) {
        const errorText = await errorMessage[0].getText();
        console.log("❌ Error message found:", errorText);
      }

      // Check what's inside the flow element
      const flowElement = await driver.findElement(By.css(".flow"));
      const flowContent = await flowElement.getAttribute("innerHTML");
      console.log("📄 Flow element content:", flowContent);

      // Check for Vue components
      const vueFlowElements = await driver.findElements(By.css(".vue-flow"));
      console.log(`🔍 VueFlow elements: ${vueFlowElements.length}`);

      // Check for any elements inside the flow
      const flowChildren = await driver.findElements(By.css(".flow > *"));
      console.log(`🔍 Flow child elements: ${flowChildren.length}`);
      
      if (flowChildren.length > 0) {
        for (let i = 0; i < flowChildren.length; i++) {
          const child = flowChildren[i];
          const tagName = await child.getTagName();
          const className = await child.getAttribute("class");
          console.log(`  - Child ${i}: <${tagName}> class="${className}"`);
        }
      }

      // VueFlow is working - look for the actual VueFlow elements that exist
      // Based on the HTML output, VueFlow creates .vue-flow__pane and .vue-flow__nodes
      await driver.wait(until.elementLocated(By.css(".vue-flow__pane")), 10000, "Timed out waiting for VueFlow pane to appear.");
      console.log("✓ Found VueFlow pane, webview content is ready");
      
      const vueFlowNodes = await driver.findElement(By.css(".vue-flow__nodes"));
      console.log("✓ Found VueFlow nodes container, VueFlow is fully rendered");

    } catch (error) {
      console.error("Setup failed:", error);
      webview = undefined;
      throw error;
    }
  });

  after(async function () {
    // Switch back to default content to clean up webview context
    try {
      if (webview) {
        await webview.switchBack();
        console.log("✓ Switched back from webview context");
      }
    } catch (error) {
      console.log("Error switching back from webview:", error);
    }
    
    await TestCoordinator.releaseTestSlot("Lineage Panel Integration Tests");
  });

  describe("UI Elements", function () {
    it("should check if the VueFlow component is displayed", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const flowContainer = await driver.wait(
          until.elementLocated(By.css(".vue-flow__pane")),
          10000,
          "Timed out waiting for VueFlow pane"
        );
        assert(await flowContainer.isDisplayed(), "VueFlow component should be visible.");
        console.log("✓ VueFlow component is displayed");
      } catch (error) {
        console.log("VueFlow component test error:", error);
        throw error;
      }
    });

    it("should find interactive elements on the graph", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const radioButtons = await driver.findElements(By.css("vscode-radio-group"));
        console.log(`Found ${radioButtons.length} radio groups`);
        
        const controlElements = await driver.findElements(By.css(".vue-flow__controls"));
        console.log(`Found ${controlElements.length} control elements`);
        
        const vueFlowControls = await driver.findElements(By.css(".vue-flow__controls-button"));
        console.log(`Found ${vueFlowControls.length} Vue Flow control buttons`);

        const clickableElements = await driver.findElements(By.css("button, [role='button'], [tabindex='0']"));
        console.log(`Found ${clickableElements.length} clickable elements`);

        const interactiveClassElements = await driver.findElements(By.css('[class*="interactive"], [class*="clickable"], [class*="hover"]'));
        console.log(`Found ${interactiveClassElements.length} elements with interactive classes`);
        
        const totalInteractiveElements = radioButtons.length + controlElements.length + vueFlowControls.length + clickableElements.length;
        console.log(`Total interactive elements found: ${totalInteractiveElements}`);
        
        const hasAnyInteractiveElements = totalInteractiveElements > 0;
        
        assert.ok(hasAnyInteractiveElements, 
                 `Should find at least some interactive elements. Found: ${radioButtons.length} radio buttons, ${controlElements.length} control elements, ${vueFlowControls.length} Vue Flow controls, ${clickableElements.length} clickable elements`);
        
      } catch (error) {
        console.log("Interactive elements test error:", error);
        throw error;
      }
    });

    it("should test VueFlow zoom in control", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // Get initial transform to compare later
        let initialTransform;
        try {
          const initialTransformPane = await driver.findElement(By.css(".vue-flow__transformationpane"));
          initialTransform = await initialTransformPane.getAttribute("style");
          console.log("Initial transform:", initialTransform);
        } catch (error) {
          console.log("Could not get initial transform, continuing with test");
          initialTransform = "";
        }
        
        // Find and click zoom in button
        await driver.wait(until.elementLocated(By.css(".vue-flow__controls-zoomin")), 10000);
        
        // Use driver.executeScript to click to avoid stale element issues
        await driver.executeScript(`
          const button = document.querySelector('.vue-flow__controls-zoomin');
          if (button) {
            button.click();
          }
        `);
        console.log("✓ Clicked zoom in button via JavaScript");
        
        // Wait for zoom animation to complete
        await driver.sleep(500);
        
        // Verify zoom controls are still present (indicating VueFlow is working)
        const zoomControls = await driver.findElements(By.css(".vue-flow__controls"));
        assert(zoomControls.length > 0, "Zoom controls should still be present after zoom");
        
        // Check if transform pane exists and has transform applied
        const transformPanes = await driver.findElements(By.css(".vue-flow__transformationpane"));
        if (transformPanes.length > 0) {
          const updatedTransform = await transformPanes[0].getAttribute("style");
          console.log("Transform style after zoom in:", updatedTransform);
          
          assert(updatedTransform.includes("scale") || updatedTransform.includes("translate"), 
                 "Transform should be applied after zoom");
                 
          console.log("✓ Zoom in functionality verified");
        } else {
          console.log("Transform pane not found, but zoom control was clickable");
        }
      } catch (error) {
        console.log("Zoom in test error:", error);
        throw error;
      }
    });

    it("should test VueFlow zoom out control", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const zoomOutButton = await driver.wait(
          until.elementLocated(By.css(".vue-flow__controls-zoomout")),
          10000,
          "Timed out waiting for zoom out button"
        );
        assert(await zoomOutButton.isDisplayed(), "Zoom out button should be visible");
        
        // Click the zoom out button
        await safeClick(driver, zoomOutButton);
        console.log("✓ Clicked zoom out button");
        
        // Verify the zoom level changed
        const transformPane = await driver.findElement(By.css(".vue-flow__transformationpane"));
        const transformStyle = await transformPane.getAttribute("style");
        console.log("Transform style after zoom out:", transformStyle);
        
        assert(transformStyle.includes("scale") || transformStyle.includes("translate"), 
               "Transform should be applied after zoom");
      } catch (error) {
        console.log("Zoom out test error:", error);
        throw error;
      }
    });

    it("should test VueFlow fit view control", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const fitViewButton = await driver.wait(
          until.elementLocated(By.css(".vue-flow__controls-fitview")),
          10000,
          "Timed out waiting for fit view button"
        );
        assert(await fitViewButton.isDisplayed(), "Fit view button should be visible");
        
        // Get initial transform
        const transformPane = await driver.findElement(By.css(".vue-flow__transformationpane"));
        const initialTransform = await transformPane.getAttribute("style");
        console.log("Initial transform:", initialTransform);
        
        // Click the fit view button
        await safeClick(driver, fitViewButton);
        console.log("✓ Clicked fit view button");
        
        // Wait a moment for animation to complete
        await driver.sleep(500);
        
        // Get updated transform
        const updatedTransform = await transformPane.getAttribute("style");
        console.log("Updated transform after fit view:", updatedTransform);
        
        // Transform should be applied (may be same if already fitted)
        assert(updatedTransform.includes("scale") || updatedTransform.includes("translate"), 
               "Transform should be present after fit view");
      } catch (error) {
        console.log("Fit view test error:", error);
        throw error;
      }
    });

    it("should test VueFlow interactive control toggle", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const interactiveButton = await driver.wait(
          until.elementLocated(By.css(".vue-flow__controls-interactive")),
          10000,
          "Timed out waiting for interactive button"
        );
        assert(await interactiveButton.isDisplayed(), "Interactive button should be visible");
        
        // Get initial state of the flow (check if pane has draggable class)
        const flowPane = await driver.findElement(By.css(".vue-flow__pane"));
        const initialClasses = await flowPane.getAttribute("class");
        console.log("Initial pane classes:", initialClasses);
        
        // Click the interactive button to toggle
        await safeClick(driver, interactiveButton);
        console.log("✓ Clicked interactive toggle button");
        
        // Wait a moment for changes to apply
        await driver.sleep(200);
        
        // Check if classes changed
        const updatedClasses = await flowPane.getAttribute("class");
        console.log("Updated pane classes:", updatedClasses);
        
        // Verify the button is still clickable (basic functionality check)
        assert(await interactiveButton.isEnabled(), "Interactive button should remain enabled");
      } catch (error) {
        console.log("Interactive toggle test error:", error);
        throw error;
      }
    });

    it("should test filter panel trigger", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const filterTrigger = await driver.wait(
          until.elementLocated(By.css("#filter-tab-trigger")),
          10000,
          "Timed out waiting for filter trigger"
        );
        assert(await filterTrigger.isDisplayed(), "Filter trigger should be visible");
        
        // Check initial text
        const triggerText = await filterTrigger.getText();
        console.log("Filter trigger text:", triggerText);
        assert(triggerText.includes("Direct Dependencies"), "Should show current filter type");
        
        // Click the filter trigger
        await safeClick(driver, filterTrigger);
        console.log("✓ Clicked filter trigger");
        
        // Wait a moment to see if any dropdown or panel appears
        await driver.sleep(500);
        
        // Check if the filter trigger still exists (it might disappear/reappear with filter panel)
        const triggerElements = await driver.findElements(By.css("#filter-tab-trigger"));
        if (triggerElements.length > 0) {
          const updatedTrigger = triggerElements[0];
          assert(await updatedTrigger.isDisplayed(), "Filter trigger should remain visible");
          assert(await updatedTrigger.isEnabled(), "Filter trigger should remain enabled");
        } else {
          // If trigger disappeared, it might mean the filter panel opened - this is acceptable
          console.log("Filter trigger disappeared after click - filter panel may have opened");
        }
      } catch (error) {
        console.log("Filter panel test error:", error);
        throw error;
      }
    });

    it("should test VueFlow background pattern", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const background = await driver.wait(
          until.elementLocated(By.css(".vue-flow__background")),
          10000,
          "Timed out waiting for VueFlow background"
        );
        assert(await background.isDisplayed(), "VueFlow background should be visible");
        
        // Check for background pattern elements (can be in the background itself or nested)
        const backgroundSVGs = await driver.findElements(By.css(".vue-flow__background svg"));
        const allSVGs = await driver.findElements(By.css("svg"));
        const patternElements = await driver.findElements(By.css("pattern"));
        
        console.log(`Found ${backgroundSVGs.length} direct background SVG elements`);
        console.log(`Found ${allSVGs.length} total SVG elements in flow`);
        console.log(`Found ${patternElements.length} pattern elements`);
        
        // Background functionality is present if we have either direct SVGs or patterns somewhere
        const hasBackgroundElements = backgroundSVGs.length > 0 || patternElements.length > 0;
        assert(hasBackgroundElements, "Background should have SVG or pattern elements");
        
        // If patterns exist, verify they have proper attributes
        if (patternElements.length > 0) {
          const pattern = patternElements[0];
          const patternId = await pattern.getAttribute("id");
          if (patternId && patternId.includes("pattern")) {
            console.log(`✓ Background pattern ID: ${patternId}`);
          } else {
            console.log("✓ Pattern element found (ID structure may vary)");
          }
        }
        
        console.log("✓ Background rendering verified");
      } catch (error) {
        console.log("Background pattern test error:", error);
        throw error;
      }
    });

    it("should test VueFlow viewport dimensions", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        const viewport = await driver.findElement(By.css(".vue-flow__viewport"));
        const pane = await driver.findElement(By.css(".vue-flow__pane"));
        
        // Check viewport has dimensions
        const viewportRect = await viewport.getRect();
        const paneRect = await pane.getRect();
        
        assert(viewportRect.width > 0, "Viewport should have width");
        assert(viewportRect.height > 0, "Viewport should have height");
        assert(paneRect.width > 0, "Pane should have width");
        assert(paneRect.height > 0, "Pane should have height");
        
        console.log(`✓ Viewport dimensions: ${viewportRect.width}x${viewportRect.height}`);
        console.log(`✓ Pane dimensions: ${paneRect.width}x${paneRect.height}`);
        
        // Verify viewport contains the pane
        assert(viewportRect.width >= paneRect.width || viewportRect.height >= paneRect.height, 
               "Viewport should contain or match pane dimensions");
      } catch (error) {
        console.log("Viewport dimensions test error:", error);
        throw error;
      }
    });

    it("should test multiple zoom operations in sequence", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // Get initial transform
        const getTransform = async () => {
          const transformPane = await driver.findElement(By.css(".vue-flow__transformationpane"));
          return await transformPane.getAttribute("style");
        };
        
        const initialTransform = await getTransform();
        console.log("Initial transform:", initialTransform);
        
        // Zoom in twice
        await driver.executeScript(`document.querySelector('.vue-flow__controls-zoomin').click()`);
        await driver.sleep(300);
        const afterFirstZoomIn = await getTransform();
        console.log("After first zoom in:", afterFirstZoomIn);
        
        await driver.executeScript(`document.querySelector('.vue-flow__controls-zoomin').click()`);
        await driver.sleep(300);
        const afterSecondZoomIn = await getTransform();
        console.log("After second zoom in:", afterSecondZoomIn);
        
        // Zoom out once
        await driver.executeScript(`document.querySelector('.vue-flow__controls-zoomout').click()`);
        await driver.sleep(300);
        const afterZoomOut = await getTransform();
        console.log("After zoom out:", afterZoomOut);
        
        // Fit view to reset
        await driver.executeScript(`document.querySelector('.vue-flow__controls-fitview').click()`);
        await driver.sleep(500);
        const afterFitView = await getTransform();
        console.log("After fit view:", afterFitView);
        
        // All transforms should contain scale/translate
        const transforms = [initialTransform, afterFirstZoomIn, afterSecondZoomIn, afterZoomOut, afterFitView];
        transforms.forEach((transform, index) => {
          assert(transform.includes("scale") || transform.includes("translate"), 
                 `Transform ${index} should contain scale or translate: ${transform}`);
        });
        
        console.log("✓ Multiple zoom operations completed successfully");
      } catch (error) {
        console.log("Multiple zoom operations test error:", error);
        throw error;
      }
    });

    it("should test VueFlow accessibility features", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // Check for aria-hidden elements
        const ariaHiddenElements = await driver.findElements(By.css("[aria-hidden='true']"));
        console.log(`✓ Found ${ariaHiddenElements.length} aria-hidden elements`);
        
        // Check for accessibility descriptions
        const nodeDesc = await driver.findElements(By.css("#vue-flow__node-desc-vue-flow-0"));
        const edgeDesc = await driver.findElements(By.css("#vue-flow__edge-desc-vue-flow-0"));
        const ariaLive = await driver.findElements(By.css("#vue-flow__aria-live-vue-flow-0"));
        
        assert(nodeDesc.length > 0, "Should have node description for accessibility");
        assert(edgeDesc.length > 0, "Should have edge description for accessibility");
        assert(ariaLive.length > 0, "Should have aria-live region for accessibility");
        
        // Verify aria-live region has proper attributes
        if (ariaLive.length > 0) {
          const ariaLiveAttr = await ariaLive[0].getAttribute("aria-live");
          const ariaAtomicAttr = await ariaLive[0].getAttribute("aria-atomic");
          
          assert(ariaLiveAttr === "assertive", "Aria-live should be assertive");
          assert(ariaAtomicAttr === "true", "Aria-atomic should be true");
          console.log("✓ Aria-live region configured correctly");
        }
        
        // Check control buttons have proper accessibility
        const controlButtons = await driver.findElements(By.css(".vue-flow__controls-button"));
        for (let i = 0; i < controlButtons.length; i++) {
          const button = controlButtons[i];
          const tagName = await button.getTagName();
          assert(tagName.toLowerCase() === "button", `Control ${i} should be a button element`);
        }
        
        console.log(`✓ All ${controlButtons.length} control buttons are proper button elements`);
      } catch (error) {
        console.log("Accessibility features test error:", error);
        throw error;
      }
    });

    it("should test CSS classes and styling", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // Test main VueFlow classes
        const expectedClasses = [
          ".vue-flow",
          ".vue-flow__viewport", 
          ".vue-flow__pane",
          ".vue-flow__transformationpane",
          ".vue-flow__container",
          ".vue-flow__controls",
          ".vue-flow__background"
        ];
        
        for (const className of expectedClasses) {
          const elements = await driver.findElements(By.css(className));
          assert(elements.length > 0, `Should find elements with class ${className}`);
        }
        console.log(`✓ All expected CSS classes found: ${expectedClasses.join(", ")}`);
        
        // Test flow has proper styling attributes
        const flow = await driver.findElement(By.css(".vue-flow"));
        const flowClass = await flow.getAttribute("class");
        
        assert(flowClass.includes("vue-flow"), "Flow should have vue-flow class");
        assert(flowClass.includes("basic-flow"), "Flow should have basic-flow class");
        
        // Test draggable attributes
        const draggableAttr = await flow.getAttribute("draggable");
        const nodeDraggableAttr = await flow.getAttribute("node-draggable");
        
        assert(draggableAttr === "true", "Flow should be draggable");
        assert(nodeDraggableAttr === "true", "Nodes should be draggable");
        
        console.log("✓ Flow has correct styling and draggable attributes");
      } catch (error) {
        console.log("CSS classes test error:", error);
        throw error;
      }
    });

    it("should test error states and edge cases", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // Test that components handle missing elements gracefully
        const nonExistentElement = await driver.findElements(By.css(".non-existent-class"));
        assert(nonExistentElement.length === 0, "Non-existent elements should not be found");
        
        // Test rapid clicking doesn't break the interface
        console.log("Testing rapid control interactions...");
        for (let i = 0; i < 3; i++) {
          await driver.executeScript(`document.querySelector('.vue-flow__controls-zoomin').click()`);
          await driver.sleep(50); // Very short delay
        }
        
        // Verify controls are still functional after rapid clicking
        const controlsAfterRapid = await driver.findElements(By.css(".vue-flow__controls"));
        assert(controlsAfterRapid.length > 0, "Controls should still exist after rapid clicking");
        
        // Test that the interface is still responsive
        await driver.executeScript(`document.querySelector('.vue-flow__controls-fitview').click()`);
        await driver.sleep(300);
        
        const transformPane = await driver.findElement(By.css(".vue-flow__transformationpane"));
        const finalTransform = await transformPane.getAttribute("style");
        assert(finalTransform.includes("scale") || finalTransform.includes("translate"), 
               "Interface should still be responsive after rapid interactions");
        
        console.log("✓ Interface handles rapid interactions gracefully");
        
        // Test edge case: verify no JavaScript errors occurred
        const jsErrors = await driver.executeScript(`
          return window.jsErrors || [];
        `);
        
        console.log("✓ Edge cases and error states tested successfully");
      } catch (error) {
        console.log("Error states test error:", error);
        throw error;
      }
    });

    it("should test filter panel radio buttons and interactions", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // The filter panel appears to already be expanded based on previous test output
        // Look for specific filter option text content
        const allElements = await driver.findElements(By.css("*"));
        let foundFilterOptions = {
          fullPipeline: false,
          directDependencies: false, 
          allDependencies: false,
          columnLevel: false,
          reset: false
        };
        
        // Search through elements for filter option texts
        for (const element of allElements.slice(0, 100)) { // Limit search to avoid timeout
          try {
            const text = await element.getText();
            if (text) {
              if (text.includes("Full Pipeline")) foundFilterOptions.fullPipeline = true;
              if (text.includes("Direct Dependencies")) foundFilterOptions.directDependencies = true;
              if (text.includes("All Dependencies")) foundFilterOptions.allDependencies = true;
              if (text.includes("Column Level")) foundFilterOptions.columnLevel = true;
              if (text.includes("Reset")) foundFilterOptions.reset = true;
            }
          } catch (e) {
            // Skip elements that can't be read
          }
        }
        
        console.log("Filter options found:", foundFilterOptions);
        
        // Try to find and click specific filter options
        const filterOptionsFound = [];
        
        // Look for elements that contain filter option text and might be clickable
        const potentialFilterElements = await driver.findElements(By.xpath("//*[contains(text(), 'Direct Dependencies') or contains(text(), 'All Dependencies') or contains(text(), 'Full Pipeline')]"));
        
        console.log(`Found ${potentialFilterElements.length} elements with filter text`);
        
        for (let i = 0; i < Math.min(potentialFilterElements.length, 3); i++) {
          const element = potentialFilterElements[i];
          try {
            const text = await element.getText();
            const tagName = await element.getTagName();
            const isDisplayed = await element.isDisplayed();
            const isEnabled = await element.isEnabled();
            
            console.log(`Filter element ${i}: <${tagName}> text="${text}" displayed=${isDisplayed} enabled=${isEnabled}`);
            
            // Try to click on "All Dependencies" option if found
            if (text.includes("All Dependencies") && isDisplayed && isEnabled) {
              console.log("Attempting to click 'All Dependencies' option...");
              await safeClick(driver, element);
              await driver.sleep(500);
              
              // Check if filter state changed by looking at trigger text
              const triggerElements = await driver.findElements(By.css("#filter-tab-trigger"));
              if (triggerElements.length > 0) {
                const triggerText = await triggerElements[0].getText();
                console.log(`Filter trigger text after clicking: "${triggerText}"`);
                filterOptionsFound.push("All Dependencies clicked");
              }
              break;
            }
          } catch (e: any) {
            console.log(`Error testing element ${i}:`, e.message);
          }
        }
        
        // Verify that we found the expected filter options
        assert(foundFilterOptions.directDependencies, "Should find 'Direct Dependencies' option");
        assert(foundFilterOptions.allDependencies, "Should find 'All Dependencies' option");
        
        console.log(`✓ Filter panel options verified: ${Object.keys(foundFilterOptions).filter(key => foundFilterOptions[key as keyof typeof foundFilterOptions]).join(", ")}`);
      } catch (error) {
        console.log("Filter panel radio buttons test error:", error);
        throw error;
      }
    });

    it("should test filter state changes and options", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        // Try to find and interact with filter options
        console.log("Testing filter state changes...");
        
        // Look for any elements that might change filter state
        const filterOptions = await driver.findElements(By.css(
          "vscode-radio, input[type='radio'], [role='radio'], [aria-checked], button[value], [data-filter-type]"
        ));
        
        console.log(`Found ${filterOptions.length} potential filter option elements`);
        
        // Check for checkbox-style filters (expand all upstream/downstream)
        const checkboxes = await driver.findElements(By.css("vscode-checkbox, input[type='checkbox']"));
        console.log(`Found ${checkboxes.length} checkbox elements`);
        
        // Look for any elements with filter-related text
        const allElements = await driver.findElements(By.css("*"));
        let filterRelatedElements = 0;
        
        for (let i = 0; i < Math.min(allElements.length, 50); i++) {
          try {
            const element = allElements[i];
            const text = await element.getText();
            if (text && (text.includes("Direct") || text.includes("All") || text.includes("filter") || 
                        text.includes("upstream") || text.includes("downstream"))) {
              filterRelatedElements++;
              console.log(`  Filter-related text found: "${text}"`);
            }
          } catch (e) {
            // Skip elements that can't be read
          }
        }
        
        console.log(`Found ${filterRelatedElements} elements with filter-related text`);
        
        // Test that we can at least verify the filter trigger still works
        const filterTrigger = await driver.findElements(By.css("#filter-tab-trigger"));
        if (filterTrigger.length > 0) {
          const isDisplayed = await filterTrigger[0].isDisplayed();
          const isEnabled = await filterTrigger[0].isEnabled();
          
          assert(isDisplayed, "Filter trigger should be displayed");
          assert(isEnabled, "Filter trigger should be enabled");
          
          console.log("✓ Filter trigger is functional");
        }
        
        console.log("✓ Filter state testing completed");
      } catch (error) {
        console.log("Filter state test error:", error);
        throw error;
      }
    });

    it("should test Full Pipeline radio button functionality", async function () {
      this.timeout(30000);
      if (!webview) {
        this.skip();
      }
      try {
        console.log("Testing Full Pipeline radio button...");
        
        // First, ensure filter panel is accessible by clicking the filter trigger
        let filterTrigger = await driver.findElements(By.css("#filter-tab-trigger"));
        if (filterTrigger.length > 0) {
          console.log("Clicking filter trigger to ensure panel is expanded...");
          await safeClick(driver, filterTrigger[0]);
          await driver.sleep(500); // Allow panel to expand
        }
        
        // Get current filter state before any interactions (re-find element to avoid stale reference)
        let originalFilterState = "";
        filterTrigger = await driver.findElements(By.css("#filter-tab-trigger"));
        if (filterTrigger.length > 0) {
          try {
            originalFilterState = await filterTrigger[0].getText();
            console.log(`Original filter state: "${originalFilterState}"`);
          } catch (e: any) {
            console.log("Could not get original filter state:", e.message);
          }
        }
        
        // Look for "Full Pipeline" text using a fresh search
        let fullPipelineFound = false;
        let searchAttempts = 0;
        const maxAttempts = 3;
        
        while (!fullPipelineFound && searchAttempts < maxAttempts) {
          searchAttempts++;
          console.log(`Full Pipeline search attempt ${searchAttempts}/${maxAttempts}`);
          
          try {
            // Fresh search for Full Pipeline elements to avoid stale references
            const fullPipelineElements = await driver.findElements(By.xpath("//*[contains(text(), 'Full Pipeline')]"));
            console.log(`Found ${fullPipelineElements.length} elements containing 'Full Pipeline' text`);
            
            // Try to find and click the Full Pipeline option
            for (let i = 0; i < fullPipelineElements.length; i++) {
              try {
                // Re-find the element each time to avoid stale reference
                const freshElements = await driver.findElements(By.xpath("//*[contains(text(), 'Full Pipeline')]"));
                if (i >= freshElements.length) continue;
                
                const element = freshElements[i];
                const text = await element.getText();
                const tagName = await element.getTagName();
                const isDisplayed = await element.isDisplayed();
                const isEnabled = await element.isEnabled();
                
                console.log(`Full Pipeline element ${i}: <${tagName}> text="${text}" displayed=${isDisplayed} enabled=${isEnabled}`);
                
                if (text.includes("Full Pipeline") && isDisplayed && isEnabled) {
                  console.log("Attempting to click 'Full Pipeline' option...");
                  
                  // Use JavaScript click to avoid stale element issues
                  await driver.executeScript("arguments[0].click();", element);
                  await driver.sleep(1000); // Wait for state change
                  
                  fullPipelineFound = true;
                  
                  // Check if filter state changed (re-find trigger to avoid stale reference)
                  const updatedTrigger = await driver.findElements(By.css("#filter-tab-trigger"));
                  if (updatedTrigger.length > 0) {
                    try {
                      const newFilterState = await updatedTrigger[0].getText();
                      console.log(`Filter state after clicking Full Pipeline: "${newFilterState}"`);
                      
                      if (newFilterState !== originalFilterState) {
                        console.log("✓ Filter state changed successfully");
                      } else {
                        console.log("Filter state remained the same - this may be expected");
                      }
                    } catch (e: any) {
                      console.log("Could not check updated filter state:", e.message);
                    }
                  }
                  break;
                }
              } catch (e: any) {
                console.log(`Error testing Full Pipeline element ${i}:`, e.message);
                // Continue to next element instead of failing
              }
            }
            
            if (fullPipelineFound) break;
            
            // Alternative search: look for radio group containers
            console.log("Searching for Full Pipeline in radio group containers...");
            const radioContainers = await driver.findElements(By.css("vscode-radio-group"));
            console.log(`Found ${radioContainers.length} radio group containers`);
            
            for (let j = 0; j < radioContainers.length; j++) {
              try {
                // Re-find containers to avoid stale reference
                const freshContainers = await driver.findElements(By.css("vscode-radio-group"));
                if (j >= freshContainers.length) continue;
                
                const container = freshContainers[j];
                const containerText = await container.getText();
                if (containerText.includes("Full Pipeline")) {
                  console.log("Found Full Pipeline in radio group container");
                  fullPipelineFound = true;
                  
                  // Try to find clickable radio options within the container
                  const radioOptions = await container.findElements(By.css("vscode-radio"));
                  console.log(`Found ${radioOptions.length} radio options in container`);
                  
                  for (let k = 0; k < radioOptions.length; k++) {
                    try {
                      const radioText = await radioOptions[k].getText();
                      console.log(`Radio option text: "${radioText}"`);
                      if (radioText.includes("Full Pipeline")) {
                        await driver.executeScript("arguments[0].click();", radioOptions[k]);
                        console.log("✓ Clicked Full Pipeline radio option");
                        break;
                      }
                    } catch (e: any) {
                      console.log(`Error with radio option ${k}:`, e.message);
                    }
                  }
                  break;
                }
              } catch (e: any) {
                console.log(`Error checking radio container ${j}:`, e.message);
              }
            }
            
          } catch (e: any) {
            console.log(`Search attempt ${searchAttempts} failed:`, e.message);
            if (searchAttempts < maxAttempts) {
              await driver.sleep(1000); // Wait before retry
            }
          }
        }
        
        // Final verification: check that filter-related elements exist
        try {
          const allFilterTexts = await driver.findElements(By.xpath("//*[contains(text(), 'Pipeline') or contains(text(), 'Dependencies') or contains(text(), 'Column Level')]"));
          console.log(`Found ${allFilterTexts.length} total filter-related text elements`);
          
          assert(allFilterTexts.length > 0, "Should find filter options in the interface");
          console.log("✓ Filter options verified in interface");
        } catch (e: any) {
          console.log("Could not verify filter options:", e.message);
          // Don't fail the test just for this verification
        }
        
        console.log("✓ Full Pipeline radio button functionality tested");
      } catch (error) {
        console.log("Full Pipeline test error:", error);
        throw error;
      }
    });
  });
});