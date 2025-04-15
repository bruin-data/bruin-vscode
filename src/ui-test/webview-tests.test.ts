import * as assert from "assert";
import { Workbench, InputBox, WebDriver, By, WebView, VSBrowser } from "vscode-extension-tester";
import { Key, until, WebElement } from "selenium-webdriver";
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
    this.timeout(120000); // Increase timeout for setup
    workbench = new Workbench();
    testWorkspacePath = path.resolve(__dirname, "test-pipeline", "assets");
    testAssetFilePath = path.join(testWorkspacePath, "example.sql");

    await workbench.executeCommand("workbench.action.quickOpen");
    await sleep(1000);

    const quickOpenBox = await InputBox.create();
    await quickOpenBox.setText(testAssetFilePath);
    await sleep(2000);
    await quickOpenBox.confirm();
    // Add explicit editor wait
    await driver.wait(
      until.elementLocated(
        By.className("editor-instance") // Match the CI error selector
      ),
      30000
    );
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
  describe("Asset Name Tests", function () {
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
      // Clear using JavaScript executor
      await driver.executeScript('arguments[0].value = ""', nameInput);
      // Set the new name
      const newName = `NameTest_${Date.now()}`;
      await nameInput.sendKeys(newName);
      await sleep(1000);

      // Verification: Retrieve the value from the input field.
      const displayedValue = await nameInput.getAttribute("value");
      assert.strictEqual(displayedValue, newName, "Asset name should be updated");
    });
  });
  describe("Edit asset Description Tests", function () {
    let assetDetailsTab: WebElement;
    it("should output the page source for debugging", async function () {
      this.timeout(10000);
      // Ensure driver is set
      driver = VSBrowser.instance.driver;
      const pageSource = await driver.getPageSource();
      assert.ok(pageSource, "Page source should be available");
    });

    it("should access the tab", async function () {
      this.timeout(10000);
      // Ensure driver is set
      assetDetailsTab = await webview.findWebElement(By.id("tab-0"));
      await assetDetailsTab.click();
      await sleep(1000);
      assert.ok(assetDetailsTab, "Tab should be accessible");
    });
    it("should edit description successfully", async function () {
      this.timeout(30000);

      // 1. Switch to Asset Details tab
      const tab = await driver.wait(until.elementLocated(By.id("tab-0")), 5000);
      await tab.click();
      await driver.wait(until.elementLocated(By.id("asset-description-container")), 5000);

      // 2. Activate edit mode
      const descriptionSection = await driver.wait(
        until.elementLocated(By.id("asset-description-container")),
        5000
      );

      // Hover to reveal edit button
      await driver.actions().move({ origin: descriptionSection }).pause(500).perform();

      // Find and click edit button
      const editButton = await driver.wait(
        until.elementLocated(By.css('vscode-button[appearance="icon"]')),
        5000
      );
      await editButton.click();

      // Wait for textarea to be visible
      await driver.wait(until.elementLocated(By.id("description-input")), 5000);
      // 3. Handle text input
      const textarea = await driver.wait(until.elementLocated(By.id("description-input")), 5000);
      // Clear using JavaScript executor
      await driver.executeScript(
        'arguments[0].value = ""; arguments[0].dispatchEvent(new Event("input"))',
        textarea
      );

      // Verify empty state
      const currentValue = await textarea.getAttribute("value");
      if (currentValue !== "") {
        throw new Error("Textarea was not cleared properly");
      }
      const testText = `Description TEST_${Date.now()}`;
      await textarea.sendKeys(testText);
      await sleep(1000);
      // 4. Save changes
      const saveButton = await driver.wait(
        until.elementLocated(By.css('vscode-button[title="save"]')),
        5000
      );
      await saveButton.click();
      await sleep(1000);
      // 5. Verify update
      const updatedText = await driver
        .wait(until.elementLocated(By.id("asset-description-container")), 5000)
        .getText();
      await sleep(1000);
      assert.strictEqual(updatedText, testText, `Description should be updated to "${testText}"`);
    });
  });
});
