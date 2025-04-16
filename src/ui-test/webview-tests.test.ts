import * as assert from "assert";
import { Workbench, InputBox, WebDriver, By, WebView, VSBrowser, TerminalView } from "vscode-extension-tester";
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
    this.timeout(180000); // Increase timeout for CI

    // Initialize Workbench and compute paths
    workbench = new Workbench();
    const repoRoot = process.env.REPO_ROOT || path.resolve(__dirname, "../../");
    testWorkspacePath = path.join(repoRoot, "out", "ui-test", "test-pipeline");
    testAssetFilePath = path.join(testWorkspacePath, "assets", "example.sql");

    await VSBrowser.instance.openResources(testAssetFilePath);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait longer in CI

    // Log the open editor titles for debugging
    const editorView = workbench.getEditorView();
    const openEditorTitles = await editorView.getOpenEditorTitles();
    console.log("Open editor titles:", openEditorTitles);

    if (!openEditorTitles.includes("example.sql")) {
      throw new Error(`example.sql not found in open editors. Current titles: ${openEditorTitles.join(", ")}`);
    }

    await workbench.executeCommand("bruin.renderSQL");
    await new Promise((resolve) => setTimeout(resolve, 6000));
    driver = VSBrowser.instance.driver;

    // Wait for the webview iframe to be present
    await driver.wait(
      until.elementLocated(By.className("editor-instance")),
      30000,
      "Webview iframe did not appear within 30 seconds"
    );

    webview = new WebView();
    await driver.wait(until.elementLocated(By.css(".editor-instance")), 10000);
    await webview.switchToFrame();

    // Check for specific elements or text in the webview
    const assetNameContainer = await webview.findWebElement(By.id("asset-name-container"));
    console.log("Asset name container found:", !!assetNameContainer);

    const tab0 = await webview.findWebElement(By.id("tab-0"));
    console.log("Tab 0 found:", !!tab0);
  });

  after(async function () {
    // Switch back to the main VS Code window after tests
    if (webview) {
      await webview.switchBack();
    }
  });

  describe("Asset Name Tests", function () {
    it("should display the asset name container", async function () {
      this.timeout(20000); // Increase timeout

      // Wait for the asset name container to be visible
      const assetNameContainer = await webview.findWebElement(By.id("asset-name-container"));

      assert.ok(assetNameContainer, "Asset name container should be visible");
    });

    it("should be able to edit the asset name", async function () {
      this.timeout(30000); // Increase timeout
      driver = VSBrowser.instance.driver;

      // Locate the container and trigger edit mode.
      const assetNameContainer = await webview.findWebElement(By.id("asset-name-container"));
      const actions = driver.actions({ async: true });
      await actions.move({ origin: assetNameContainer }).perform();
      await assetNameContainer.click();
      await sleep(500);

      // Wait for the input to be visible and obtain it
      let nameInput = await driver.wait(until.elementLocated(By.id("asset-name-input")), 10000); // Increase timeout
      await nameInput.clear();
      await sleep(500);

      // Re-locate the input element to fix stale element reference problem
      nameInput = await driver.wait(until.elementLocated(By.id("asset-name-input")), 10000); // Increase timeout
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
      this.timeout(20000); // Increase timeout
      // Ensure driver is set
      assetDetailsTab = await webview.findWebElement(By.id("tab-0"));
      await assetDetailsTab.click();
      await sleep(1000);
      assert.ok(assetDetailsTab, "Tab should be accessible");
    });

    it("should edit description successfully", async function () {
      this.timeout(40000); // Increase timeout

      // 1. Switch to Asset Details tab
      const tab = await driver.wait(until.elementLocated(By.id("tab-0")), 10000); // Increase timeout
      await tab.click();
      await driver.wait(until.elementLocated(By.id("asset-description-container")), 10000); // Increase timeout

      // 2. Activate edit mode
      const descriptionSection = await driver.wait(
        until.elementLocated(By.id("asset-description-container")),
        10000 // Increase timeout
      );

      // Hover to reveal edit button
      await driver.actions().move({ origin: descriptionSection }).pause(500).perform();

      // Find and click edit button
      const editButton = await driver.wait(
        until.elementLocated(By.css('vscode-button[appearance="icon"]')),
        10000 // Increase timeout
      );
      await editButton.click();

      // Wait for textarea to be visible
      await driver.wait(until.elementLocated(By.id("description-input")), 10000); // Increase timeout
      // 3. Handle text input
      const textarea = await driver.wait(until.elementLocated(By.id("description-input")), 10000); // Increase timeout
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
        10000 // Increase timeout
      );
      await saveButton.click();
      await sleep(1000);
      // 5. Verify update
      const updatedText = await driver
        .wait(until.elementLocated(By.id("asset-description-container")), 10000) // Increase timeout
        .getText();
      await sleep(1000);
      assert.strictEqual(updatedText, testText, `Description should be updated to "${testText}"`);
    });
  });
});
