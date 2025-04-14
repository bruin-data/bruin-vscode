import * as assert from "assert";
import {
  Workbench,
  InputBox,
  WebDriver,
  By,
  WebView,
  VSBrowser,
} from "vscode-extension-tester";
import { until } from "selenium-webdriver";
import "mocha";
import * as path from "path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Bruin Webview Test", function () {
    let webview: WebView;
    let driver: WebDriver;
    let workbench: Workbench;
    let testWorkspacePath: string;
    let testAssetFilePath: string;
  
    before(async function () {
      this.timeout(60000); // Increase timeout for setup
      workbench = new Workbench();
      testWorkspacePath = path.resolve(__dirname, "test-pipeline", "assets");
      testAssetFilePath = path.join(testWorkspacePath, "example.sql");
  
      await workbench.executeCommand("workbench.action.quickOpen");
      await sleep(1000);
  
      const quickOpenBox = await InputBox.create();
      await quickOpenBox.setText(testAssetFilePath);
      await sleep(2000);
      await quickOpenBox.confirm();
  
      // Allow time for the file to open
      await sleep(3000);
  
      // Open the Bruin extension's webview
      await workbench.executeCommand("bruin.renderSQL");
  
      // Wait for the webview to be created and stabilize
      await new Promise((resolve) => setTimeout(resolve, 5000));
  
      // Initialize the WebView page object
      webview = new WebView();
  
      // Switch to the webview iframe
      await webview.switchToFrame();
    });
  
    after(async function () {
      // Switch back to the main VS Code window after tests
      if (webview) {
        await webview.switchBack();
      }
    });
  
    it("should display the asset name container", async function () {
      this.timeout(10000);
  
      // Wait for the asset name container to be visible
      const assetNameContainer = await webview.findWebElement(By.id("asset-name-container"));
  
      assert.ok(assetNameContainer, "Asset name container should be visible");
    });
  
    it("should be able to edit the asset name", async function () {
      this.timeout(20000);
      driver = VSBrowser.instance.driver;
    
      // Locate the container and trigger edit mode.
      const assetNameContainer = await webview.findWebElement(By.id("asset-name-container"));
      const actions = driver.actions({ async: true });
      await actions.move({ origin: assetNameContainer }).perform();
      await assetNameContainer.click();
      await sleep(500);
  
      // Wait for the input to be visible and obtain it
      let nameInput = await driver.wait(until.elementLocated(By.id("asset-name-input")), 5000);
      await nameInput.clear();
      await sleep(500);
  
      // Re-locate the input element to fix stale element reference problem
      nameInput = await driver.wait(until.elementLocated(By.id("asset-name-input")), 5000);
      let oldName = await nameInput.getAttribute("value");
      // Set the new name
      const suffix = `_${Date.now()}`;
      await nameInput.sendKeys(suffix);
      await sleep(1000);
      const newName = oldName + suffix;
  
      // Verification: Retrieve the value from the input field.
      const displayedValue = await nameInput.getAttribute("value");
      assert.strictEqual(displayedValue, newName, "Asset name should be updated");
    });
  });