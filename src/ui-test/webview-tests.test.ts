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
      throw new Error(
        `example.sql not found in open editors. Current titles: ${openEditorTitles.join(", ")}`
      );
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
  describe("Edit Asset Name Tests", function () {
    let assetNameContainer: WebElement;

    it("should output the page source for debugging", async function () {
      this.timeout(10000);
      driver = VSBrowser.instance.driver;
      const pageSource = await driver.getPageSource();
      assert.ok(pageSource, "Page source should be available");
    });

    it("should locate the asset name container", async function () {
      this.timeout(15000);

      // Wait for the asset name container to be present
      assetNameContainer = await driver.wait(
        until.elementLocated(By.id("asset-name-container")),
        10000,
        "Asset name container not found"
      );

      assert.ok(assetNameContainer, "Asset name container should be accessible");

      // Verify the container is visible and has initial content
      const isDisplayed = await assetNameContainer.isDisplayed();
      assert.ok(isDisplayed, "Asset name container should be visible");

      const initialText = await assetNameContainer.getText();
      console.log("Initial asset name:", initialText);
      assert.ok(initialText.length > 0, "Asset name should have initial content");
    });

    it("should activate edit mode when clicking the asset name", async function () {
      this.timeout(20000);

      // Click on the asset name container to activate edit mode
      await assetNameContainer.click();
      await sleep(1000);

      // Wait for the input field to appear
      const nameInput = await driver.wait(
        until.elementLocated(By.id("asset-name-input")),
        10000,
        "Asset name input field did not appear"
      );

      assert.ok(nameInput, "Asset name input field should be present");

      // Verify the input is focused and visible
      const isDisplayed = await nameInput.isDisplayed();
      assert.ok(isDisplayed, "Asset name input should be visible");

      // Check if input has the current name as value
      const inputValue = await nameInput.getAttribute("value");
      assert.ok(inputValue && inputValue.length > 0, "Input should contain current asset name");

      console.log("Edit mode activated with value:", inputValue);
    });

    it("should edit asset name successfully", async function () {
      this.timeout(30000);

      // Click on asset name container to enter edit mode
      await assetNameContainer.click();
      await sleep(1000);

      // Wait for input field to be available
      const nameInput = await driver.wait(
        until.elementLocated(By.id("asset-name-input")),
        10000,
        "Asset name input field not found"
      );

      // Get the original name for comparison
      const originalName = await nameInput.getAttribute("value");
      console.log("Original asset name:", originalName);

      // Clear the input field using JavaScript to ensure it's completely empty
      await driver.executeScript(
        'arguments[0].value = ""; arguments[0].dispatchEvent(new Event("input", { bubbles: true }));',
        nameInput
      );

      // Verify the field is cleared
      const clearedValue = await nameInput.getAttribute("value");
      assert.strictEqual(clearedValue, "", "Input field should be cleared");

      // Type the new asset name
      const newAssetName = `TestAsset_${Date.now()}`;
      await nameInput.sendKeys(newAssetName);
      await sleep(500);

      // Verify the new value is entered
      const enteredValue = await nameInput.getAttribute("value");
      assert.strictEqual(enteredValue, newAssetName, "New asset name should be entered correctly");

      // Save by pressing Enter
      await nameInput.sendKeys(Key.ENTER);
      await sleep(2000);

      // Wait for edit mode to exit and verify the name is updated
      await driver.wait(until.stalenessOf(nameInput), 10000, "Edit mode should exit after saving");

      // Wait for the display name to update
      const displayNameElement = await driver.wait(
        until.elementLocated(By.id("input-name")),
        10000,
        "Display name element not found after save"
      );

      const updatedDisplayName = await displayNameElement.getText();
      assert.strictEqual(
        updatedDisplayName,
        newAssetName,
        `Asset name should be updated to "${newAssetName}"`
      );

      console.log("Asset name successfully updated from:", originalName, "to:", updatedDisplayName);
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

  // --- Tests for Tags ---
  describe("Edit Tags Tests", function () {
    let tagsContainer: WebElement;
    let addTagButton: WebElement;
    let tagInput: WebElement;
    let existingTags: WebElement[];

    beforeEach(async function () {
      this.timeout(10000);
      // Ensure we are on the materialization tab if not already
      const tab = await driver.wait(until.elementLocated(By.id("tab-2")), 10000);
      await tab.click();
      await sleep(500); 

      tagsContainer = await driver.wait(
        until.elementLocated(By.id("tags-container")),
        10000,
        "Tags container not found"
      );
      addTagButton = await driver.wait(
        until.elementLocated(By.id("add-tag-button")),
        10000,
        "Add tag button not found"
      );
      existingTags = await tagsContainer.findElements(By.id("tag-text"));
    });

    it("should add a new tag successfully", async function () {
      this.timeout(15000);
      const newTagName = `test_tag_${Date.now()}`;

      await addTagButton.click();
      await sleep(500);

      tagInput = await driver.wait(
        until.elementLocated(By.id("tag-input")),
        10000,
        "Tag input field not found"
      );
      await tagInput.sendKeys(newTagName);
      await tagInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const tags = await tagsContainer.findElements(By.id("tag-text"));
      const tagTexts = await Promise.all(tags.map((tag) => tag.getText()));

      assert.ok(tagTexts.includes(newTagName), `New tag "${newTagName}" should be added`);
    });

    it("should remove a tag successfully by clicking its close icon", async function () {
      this.timeout(15000);
      const tagToRemove = `remove_me_${Date.now()}`;

      // Add a tag to be removed
      await addTagButton.click();
      await sleep(500);
      tagInput = await driver.wait(until.elementLocated(By.id("tag-input")), 10000);
      await tagInput.sendKeys(tagToRemove);
      await tagInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const initialTags = await tagsContainer.findElements(By.id("tag-text"));
      const initialTagTexts = await Promise.all(initialTags.map((tag) => tag.getText()));
      assert.ok(initialTagTexts.includes(tagToRemove), "Tag to be removed should exist initially");

      const closeIconForTag = await driver.wait(
        until.elementLocated(
          By.xpath(
            `//vscode-tag[./div/span[text()="${tagToRemove}"]]/div/span[contains(@class, 'codicon-close')]`
          )
        ),
        10000,
        `Close icon for tag "${tagToRemove}" not found`
      );
      await closeIconForTag.click();
      await sleep(1000);

      const finalTags = await tagsContainer.findElements(By.id("tag-text"));
      const finalTagTexts = await Promise.all(finalTags.map((tag) => tag.getText()));

      assert.ok(!finalTagTexts.includes(tagToRemove), `Tag "${tagToRemove}" should be removed`);
    });

    it("should not add an empty tag", async function () {
      this.timeout(15000);
      const tagToAdd = "";

      await addTagButton.click();
      await sleep(500);
      tagInput = await driver.wait(until.elementLocated(By.id("tag-input")), 10000);
      await tagInput.sendKeys(tagToAdd);
      await tagInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const tags = await tagsContainer.findElements(By.id("tag-text"));
      const tagTexts = await Promise.all(tags.map((tag) => tag.getText()));
      assert.ok(!tagTexts.includes(tagToAdd), `Tag "${tagToAdd}" should not be added`);
    });
    it("should not add a tag with whitespace", async function () {
      this.timeout(15000);
      const tagToAdd = " ";

      await addTagButton.click();
      await sleep(500);
      tagInput = await driver.wait(until.elementLocated(By.id("tag-input")), 10000);
      await tagInput.sendKeys(tagToAdd);
      await tagInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const tags = await tagsContainer.findElements(By.id("tag-text"));
      const tagTexts = await Promise.all(tags.map((tag) => tag.getText()));
      assert.ok(!tagTexts.includes(tagToAdd), `Tag "${tagToAdd}" should not be added`);
    });
  });
  // owner tests
  describe("Owner Tests", function () {
    let ownerContainer: WebElement;
    let editOwnerButton: WebElement;
    let ownerInput: WebElement;
    beforeEach(async function () {
      this.timeout(10000);
      // Ensure we are on the materialization tab if not already
      const tab = await driver.wait(until.elementLocated(By.id("tab-2")), 10000);
      await tab.click();
      await sleep(500); // Give some time for the tab content to render

      ownerContainer = await driver.wait(
        until.elementLocated(By.id("owner-container")),
        10000,
        "Owner container not found"
      );
      editOwnerButton = await driver.wait(
        until.elementLocated(By.id("edit-owner-button")),
        10000,
        "Edit owner button not found"
      );
    });
    it("should edit owner successfully", async function () {
      this.timeout(15000);
      const newOwner = `owner_${Date.now()}`;

      await editOwnerButton.click();
      await sleep(500);
      ownerInput = await driver.wait(until.elementLocated(By.id("owner-input")), 10000);
      await driver.executeScript(
        'arguments[0].value = ""; arguments[0].dispatchEvent(new Event("input", { bubbles: true }));',
        ownerInput
      );

      await ownerInput.sendKeys(newOwner);
      await ownerInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const updatedText = await driver
        .wait(until.elementLocated(By.id("owner-container")), 10000)
        .getText();
      await sleep(1000);
      assert.strictEqual(updatedText, newOwner, `Owner should be updated to "${newOwner}"`);
    });
    it("should edit owner to unknown when using whitespace", async function () {
      this.timeout(15000);
      const newOwner = " ";

      await editOwnerButton.click();
      await sleep(500);
      ownerInput = await driver.wait(until.elementLocated(By.id("owner-input")), 10000);
      await driver.executeScript(
        'arguments[0].value = ""; arguments[0].dispatchEvent(new Event("input", { bubbles: true }));',
        ownerInput
      );

      await ownerInput.sendKeys(newOwner);
      await ownerInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const updatedText = await driver
        .wait(until.elementLocated(By.id("owner-container")), 10000)
        .getText();
      await sleep(1000);
      assert.strictEqual(updatedText, "Unknown", `Owner should be updated to "Unknown"`);
    });
  });
});
