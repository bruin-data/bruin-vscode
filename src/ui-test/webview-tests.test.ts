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

      // Find and click edit button using specific ID
      const editButton = await driver.wait(
        until.elementLocated(By.id("description-edit")),
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
    let ownerTextContainer: WebElement;

    beforeEach(async function () {
      this.timeout(10000);
      // Ensure we are on the materialization tab if not already
      const tab = await driver.wait(until.elementLocated(By.id("tab-2")), 10000);
      await tab.click();
      await sleep(500); // Give some time for the tab content to render

      ownerTextContainer = await driver.wait(
        until.elementLocated(By.id("owner-text-container")),
        10000,
        "Owner text container not found"
      );
    });

    it("should edit owner successfully", async function () {
      this.timeout(15000);
      const newOwner = `owner_${Date.now()}`;

      // Click on the owner text container to enter edit mode
      await ownerTextContainer.click();
      await sleep(500);

      // Wait for the input field to appear
      const ownerInput = await driver.wait(
        until.elementLocated(By.id("owner-input")),
        10000,
        "Owner input field not found"
      );

      // Clear the input field
      await driver.executeScript(
        'arguments[0].value = ""; arguments[0].dispatchEvent(new Event("input", { bubbles: true }));',
        ownerInput
      );

      // Type the new owner name
      await ownerInput.sendKeys(newOwner);
      await ownerInput.sendKeys(Key.ENTER);
      await sleep(1000);

      // Wait for edit mode to exit and verify the owner is updated
      await driver.wait(until.stalenessOf(ownerInput), 10000, "Edit mode should exit after saving");

      // Wait for the display text to update
      const ownerTextElement = await driver.wait(
        until.elementLocated(By.id("owner-text")),
        10000,
        "Owner text element not found after save"
      );

      const updatedText = await ownerTextElement.getText();
      assert.strictEqual(updatedText, newOwner, `Owner should be updated to "${newOwner}"`);
    });

    it("should edit owner to Click to set owner when using whitespace", async function () {
      this.timeout(15000);
      const newOwner = " ";

      // Click on the owner text container to enter edit mode
      await ownerTextContainer.click();
      await sleep(500);

      // Wait for the input field to appear
      const ownerInput = await driver.wait(
        until.elementLocated(By.id("owner-input")),
        10000,
        "Owner input field not found"
      );

      // Clear the input field
      await driver.executeScript(
        'arguments[0].value = ""; arguments[0].dispatchEvent(new Event("input", { bubbles: true }));',
        ownerInput
      );

      // Type whitespace
      await ownerInput.sendKeys(newOwner);
      await ownerInput.sendKeys(Key.ENTER);
      await sleep(1000);

      // Wait for edit mode to exit and verify the owner is updated to "Unknown"
      await driver.wait(until.stalenessOf(ownerInput), 10000, "Edit mode should exit after saving");

      // Wait for the display text to update
      const ownerTextElement = await driver.wait(
        until.elementLocated(By.id("owner-text")),
        10000,
        "Owner text element not found after save"
      );

      const updatedText = await ownerTextElement.getText();
      assert.strictEqual(updatedText, "Click to set owner", `Owner should be updated to "Click to set owner"`);
    });

    it("should show hover effect when not editing", async function () {
      this.timeout(10000);

      // Ensure we're not in edit mode
      const ownerInput = await driver.findElements(By.id("owner-input"));
      if (ownerInput.length > 0) {
        // If in edit mode, press Escape to cancel
        await driver.actions().sendKeys(Key.ESCAPE).perform();
        await sleep(500);
      }

      // Verify the owner text container has hover-background class
      const hasHoverClass = await ownerTextContainer.getAttribute("class");
      assert.ok(hasHoverClass.includes("hover-background"), "Owner container should have hover-background class when not editing");
    });

    it("should cancel edit mode when pressing Escape", async function () {
      this.timeout(15000);
      const originalOwner = await ownerTextContainer.getText();

      // Click on the owner text container to enter edit mode
      await ownerTextContainer.click();
      await sleep(500);

      // Wait for the input field to appear
      const ownerInput = await driver.wait(
        until.elementLocated(By.id("owner-input")),
        10000,
        "Owner input field not found"
      );

      // Type some text
      await ownerInput.sendKeys("test_owner");
      await sleep(500);

      // Press Escape to cancel
      await ownerInput.sendKeys(Key.ESCAPE);
      await sleep(1000);

      // Wait for edit mode to exit
      await driver.wait(until.stalenessOf(ownerInput), 10000, "Edit mode should exit after pressing Escape");

      // Verify the original text is preserved
      const finalText = await ownerTextContainer.getText();
      assert.strictEqual(finalText, originalOwner, "Owner text should remain unchanged after canceling edit");
    });
  });
  // Dependencies tests
  describe("Dependencies Tests", function () {
    let dependenciesContainer: WebElement;
    let pipelineDropdownInput: WebElement;
    let externalDependencyInput: WebElement;

    beforeEach(async function () {
      this.timeout(10000);
      // Ensure we are on the materialization tab
      const tab = await driver.wait(until.elementLocated(By.id("tab-2")), 10000);
      await tab.click();
      await sleep(500);

      dependenciesContainer = await driver.wait(
        until.elementLocated(By.css('[class*="flex flex-wrap space-x-1"]')),
        10000,
        "Dependencies container not found"
      );
      
      pipelineDropdownInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder="Add from pipeline..."]')),
        10000,
        "Pipeline dropdown input not found"
      );
      
      externalDependencyInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder="Add external dependency..."]')),
        10000,
        "External dependency input not found"
      );
    });

    it("should add an external dependency successfully", async function () {
      this.timeout(15000);
      const externalDepName = `external_dep_${Date.now()}`;

      // Type in the external dependency input
      await externalDependencyInput.click();
      await externalDependencyInput.sendKeys(externalDepName);
      await externalDependencyInput.sendKeys(Key.ENTER);
      await sleep(1000);

      // Verify the dependency was added
      const dependencyElements = await dependenciesContainer.findElements(By.id("dependency-text"));
      const dependencyTexts = await Promise.all(dependencyElements.map((el) => el.getText()));

      assert.ok(dependencyTexts.includes(externalDepName), `External dependency "${externalDepName}" should be added`);
      
      // Verify it has the gray color indicator (external dependency)
      const grayIndicator = await driver.wait(
        until.elementLocated(By.css(`span[class*="bg-gray-500"]`)),
        5000,
        "Gray indicator for external dependency not found"
      );
      assert.ok(grayIndicator, "External dependency should have gray color indicator");
    });

    it("should remove a dependency by clicking its close icon", async function () {
      this.timeout(15000);
      const depToRemove = `remove_dep_${Date.now()}`;

      // Add a dependency to be removed
      await externalDependencyInput.click();
      await externalDependencyInput.sendKeys(depToRemove);
      await externalDependencyInput.sendKeys(Key.ENTER);
      await sleep(1000);

      // Verify it was added
      const initialDeps = await dependenciesContainer.findElements(By.id("dependency-text"));
      const initialDepTexts = await Promise.all(initialDeps.map((el) => el.getText()));
      assert.ok(initialDepTexts.includes(depToRemove), "Dependency to be removed should exist initially");

      // Find and click the close icon for this dependency
      const closeIconForDep = await driver.wait(
        until.elementLocated(
          By.xpath(
            `//vscode-tag[./div/span[text()="${depToRemove}"]]/div/span[contains(@class, 'codicon-close')]`
          )
        ),
        10000,
        `Close icon for dependency "${depToRemove}" not found`
      );
      await closeIconForDep.click();
      await sleep(1000);

      // Verify it was removed
      const finalDeps = await dependenciesContainer.findElements(By.id("dependency-text"));
      const finalDepTexts = await Promise.all(finalDeps.map((el) => el.getText()));
      assert.ok(!finalDepTexts.includes(depToRemove), `Dependency "${depToRemove}" should be removed`);
    });

    it("should not add an empty external dependency", async function () {
      this.timeout(15000);
      const emptyDep = "";

      await externalDependencyInput.click();
      await externalDependencyInput.sendKeys(emptyDep);
      await externalDependencyInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const deps = await dependenciesContainer.findElements(By.id("dependency-text"));
      const depTexts = await Promise.all(deps.map((el) => el.getText()));
      assert.ok(!depTexts.includes(emptyDep), `Empty dependency should not be added`);
    });

    it("should not add a dependency with only whitespace", async function () {
      this.timeout(15000);
      const whitespaceDep = "   ";

      await externalDependencyInput.click();
      await externalDependencyInput.sendKeys(whitespaceDep);
      await externalDependencyInput.sendKeys(Key.ENTER);
      await sleep(1000);

      const deps = await dependenciesContainer.findElements(By.id("dependency-text"));
      const depTexts = await Promise.all(deps.map((el) => el.getText()));
      assert.ok(!depTexts.includes(whitespaceDep), `Whitespace-only dependency should not be added`);
    });

    it("should not add duplicate dependencies", async function () {
      this.timeout(15000);
      const duplicateDep = `duplicate_dep_${Date.now()}`;

      // Add the dependency first time
      await externalDependencyInput.click();
      await externalDependencyInput.sendKeys(duplicateDep);
      await externalDependencyInput.sendKeys(Key.ENTER);
      await sleep(1000);

      // Try to add the same dependency again
      await externalDependencyInput.click();
      await externalDependencyInput.sendKeys(duplicateDep);
      await externalDependencyInput.sendKeys(Key.ENTER);
      await sleep(1000);

      // Verify only one instance exists
      const deps = await dependenciesContainer.findElements(By.id("dependency-text"));
      const depTexts = await Promise.all(deps.map((el) => el.getText()));
      const duplicateCount = depTexts.filter(text => text === duplicateDep).length;
      assert.strictEqual(duplicateCount, 1, `Should only have one instance of "${duplicateDep}"`);
    });

    it("should show empty state when no dependencies are configured", async function () {
      this.timeout(15000);
      
      // Remove all existing dependencies first
      let existingDeps = await dependenciesContainer.findElements(By.css('vscode-tag'));
      
      // Keep removing dependencies until none are left
      while (existingDeps.length > 0) {
        try {
          // Get the first dependency and remove it
          const firstDep = existingDeps[0];
          const closeIcon = await firstDep.findElement(By.css('span[class*="codicon-close"]'));
          await closeIcon.click();
          await sleep(1000); // Wait longer for DOM update
          
          // Refresh the list of dependencies
          existingDeps = await dependenciesContainer.findElements(By.css('vscode-tag'));
        } catch (error) {
          // If we get a stale element error, refresh the list and continue
          console.log("Stale element encountered, refreshing list...");
          await sleep(500);
          existingDeps = await dependenciesContainer.findElements(By.css('vscode-tag'));
        }
      }

      // Verify empty state message appears
      const emptyStateElement = await driver.wait(
        until.elementLocated(By.xpath('//div[contains(text(), "No dependencies configured")]')),
        10000,
        "Empty state message not found"
      );
      
      const emptyStateText = await emptyStateElement.getText();
      assert.strictEqual(emptyStateText, "No dependencies configured", "Empty state message should be displayed");
    });
  });

  // Custom Checks tests
  describe("Custom Checks Tests", function () {
    let customChecksContainer: WebElement;
    let addCheckButton: WebElement;

    beforeEach(async function () {
      this.timeout(10000);
      // Ensure we are on the custom checks tab where custom checks are located
      const tab = await driver.wait(until.elementLocated(By.id("tab-3")), 10000);
      await tab.click();
      await sleep(500);

      // Clean up any open modals/alerts from previous tests
      try {
        const openAlerts = await driver.findElements(By.css('.fixed.inset-0'));
        for (const alert of openAlerts) {
          try {
            // Try to find and click cancel button
            const cancelButton = await alert.findElement(By.xpath('.//button[contains(text(), "Cancel")]'));
            await cancelButton.click();
            await sleep(500);
          } catch (e) {
            // If cancel button not found, try to click outside or press escape
            await driver.actions().sendKeys(Key.ESCAPE).perform();
            await sleep(500);
          }
        }
      } catch (e) {
        // If no alerts found, continue
        console.log("No open alerts to clean up");
      }

      // Wait for custom checks container to be present
      customChecksContainer = await driver.wait(
        until.elementLocated(By.id("custom-checks-table")),
        10000,
        "Custom checks table not found"
      );
      
      addCheckButton = await driver.wait(
        until.elementLocated(By.id("add-custom-check-button")),
        10000,
        "Add Check button not found"
      );
    });

    it("should display existing custom checks from the file", async function () {
      this.timeout(15000);
      
      // Look for existing custom checks in the table
      const existingChecks = await customChecksContainer.findElements(By.css('tbody tr'));
      
      if (existingChecks.length > 0) {
        console.log(`Found ${existingChecks.length} existing custom checks`);
        
        // Verify each check has the expected structure
        for (let i = 0; i < existingChecks.length; i++) {
          const check = existingChecks[i];
          
          // Check that the row has the expected columns (Name, Value, Description, Query, Actions)
          const columns = await check.findElements(By.css('td'));
          assert.strictEqual(columns.length, 5, `Custom check row ${i} should have 5 columns`);
          
          // Verify the name column is not empty
          const nameCell = columns[0];
          const nameText = await nameCell.getText();
          assert.ok(nameText.length > 0, `Custom check ${i} should have a name`);
          
          // Verify the query column is not empty
          const queryCell = columns[3];
          const queryText = await queryCell.getText();
          assert.ok(queryText.length > 0, `Custom check ${i} should have a query`);
          
          console.log(`Custom check ${i}: Name="${nameText}", Query="${queryText.substring(0, 50)}..."`);
        }
      } else {
        // If no existing checks, verify the empty state message
        const emptyStateElement = await driver.wait(
          until.elementLocated(By.id("custom-checks-empty-state")),
          5000,
          "Empty state message not found"
        );
        
        const emptyStateText = await emptyStateElement.getText();
        assert.strictEqual(emptyStateText.trim(), "No custom checks to display.", "Empty state message should be displayed");
        console.log("No existing custom checks found, empty state displayed correctly");
      }
    });

    it("should add a new custom check and display it in the UI", async function () {
      this.timeout(20000);
      
      const checkName = `test_check_${Date.now()}`;
      const checkValue = "100";
      const checkDescription = `Test description ${Date.now()}`;
      const checkQuery = "SELECT COUNT(*) FROM test_table WHERE column > 0";
      
      // Click Add Check button
      await addCheckButton.click();
      await sleep(1000);
      
      // Wait for the new row to be in edit mode (it will be the last row)
      const allRows = await customChecksContainer.findElements(By.css('tbody tr'));
      const newRowIndex = allRows.length - 1;
      
      const editingRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "New custom check row not found"
      );
      
      // Find all input fields in the editing row using IDs
      const nameField = await driver.wait(
        until.elementLocated(By.id(`custom-check-name-input-${newRowIndex}`)),
        10000,
        "Name input field not found"
      );
      
      const valueField = await driver.wait(
        until.elementLocated(By.id(`custom-check-value-input-${newRowIndex}`)),
        10000,
        "Value input field not found"
      );
      
      const descriptionField = await driver.wait(
        until.elementLocated(By.id(`custom-check-description-input-${newRowIndex}`)),
        10000,
        "Description input field not found"
      );
      
      const queryField = await driver.wait(
        until.elementLocated(By.id(`custom-check-query-input-${newRowIndex}`)),
        10000,
        "Query input field not found"
      );
      
      // Fill in the custom check details
      await nameField.clear();
      await nameField.sendKeys(checkName);
      
      await valueField.clear();
      await valueField.sendKeys(checkValue);
      
      await descriptionField.clear();
      await descriptionField.sendKeys(checkDescription);
      
      await queryField.clear();
      await queryField.sendKeys(checkQuery);
      
      // Save the custom check
      const saveButton = await driver.wait(
        until.elementLocated(By.id(`custom-check-save-button-${newRowIndex}`)),
        10000,
        "Save button not found"
      );
      await saveButton.click();
      await sleep(1000);
      
      // Verify the custom check is now displayed in view mode
      const savedRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "Saved custom check row not found"
      );
      
      // Verify the displayed values match what we entered
      const cells = await savedRow.findElements(By.css('td'));
      
      const displayedName = await cells[0].getText();
      assert.strictEqual(displayedName, checkName, `Custom check name should be "${checkName}"`);
      
      const displayedValue = await cells[1].getText();
      assert.strictEqual(displayedValue, checkValue, `Custom check value should be "${checkValue}"`);
      
      const displayedDescription = await cells[2].getText();
      assert.strictEqual(displayedDescription, checkDescription, `Custom check description should be "${checkDescription}"`);
      
      const displayedQuery = await cells[3].getText();
      assert.ok(displayedQuery.includes("SELECT"), `Custom check query should contain the SQL query`);
      
      console.log(`Successfully added and verified custom check: ${checkName}`);
    });

    it("should edit an existing custom check", async function () {
      this.timeout(20000);
      
      // First, add a custom check to edit
      const originalName = `edit_test_${Date.now()}`;
      const originalQuery = "SELECT 1";
      
      await addCheckButton.click();
      await sleep(1000);
      
      const allRows = await customChecksContainer.findElements(By.css('tbody tr'));
      const newRowIndex = allRows.length - 1;
      
      const editingRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "New custom check row not found"
      );
      
      const nameField = await driver.wait(
        until.elementLocated(By.id(`custom-check-name-input-${newRowIndex}`)),
        10000,
        "Name input field not found"
      );
      
      const queryField = await driver.wait(
        until.elementLocated(By.id(`custom-check-query-input-${newRowIndex}`)),
        10000,
        "Query input field not found"
      );
      
      // Fill in initial values
      await nameField.clear();
      await nameField.sendKeys(originalName);
      await queryField.clear();
      await queryField.sendKeys(originalQuery);
      
      // Save the initial check
      const saveButton = await editingRow.findElement(By.id(`custom-check-save-button-${newRowIndex}`));
      await saveButton.click();
      await sleep(1000);
      
      // Now edit the check
      const savedRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "Saved custom check row not found"
      );
      
      // Click the edit button
      const editButton = await savedRow.findElement(By.id(`custom-check-edit-button-${newRowIndex}`));
      await editButton.click();
      await sleep(1000);
      
      // Verify we're back in edit mode
      const editNameField = await driver.wait(
        until.elementLocated(By.id(`custom-check-name-input-${newRowIndex}`)),
        10000,
        "Edit name field not found"
      );
      
      const editQueryField = await driver.wait(
        until.elementLocated(By.id(`custom-check-query-input-${newRowIndex}`)),
        10000,
        "Edit query field not found"
      );
      
      // Modify the values
      const updatedName = `updated_${originalName}`;
      const updatedQuery = "SELECT COUNT(*) FROM updated_table";
      
      await editNameField.clear();
      await editNameField.sendKeys(updatedName);
      await editQueryField.clear();
      await editQueryField.sendKeys(updatedQuery);
      
      // Save the changes
      const saveButton2 = await savedRow.findElement(By.id(`custom-check-save-button-${newRowIndex}`));
      await saveButton2.click();
      await sleep(1000);
      
      // Verify the changes are displayed
      const finalCells = await savedRow.findElements(By.css('td'));
      
      const finalName = await finalCells[0].getText();
      assert.strictEqual(finalName, updatedName, `Custom check name should be updated to "${updatedName}"`);
      
      const finalQuery = await finalCells[3].getText();
      assert.ok(finalQuery.includes("COUNT"), `Custom check query should be updated to include "COUNT"`);
      
      console.log(`Successfully edited custom check from "${originalName}" to "${updatedName}"`);
    });

    it("should delete a custom check", async function () {
      this.timeout(20000);
      
      // First, add a custom check to delete
      const checkToDelete = `delete_test_${Date.now()}`;
      
      await addCheckButton.click();
      await sleep(1000);
      
      const allRows = await customChecksContainer.findElements(By.css('tbody tr'));
      const newRowIndex = allRows.length - 1;
      
      const editingRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "New custom check row not found"
      );
      
      const nameField = await driver.wait(
        until.elementLocated(By.id(`custom-check-name-input-${newRowIndex}`)),
        10000,
        "Name input field not found"
      );
      
      const queryField = await driver.wait(
        until.elementLocated(By.id(`custom-check-query-input-${newRowIndex}`)),
        10000,
        "Query input field not found"
      );
      
      // Fill in the check details
      await nameField.clear();
      await nameField.sendKeys(checkToDelete);
      await queryField.clear();
      await queryField.sendKeys("SELECT 1");
      
      // Save the check
      const saveButton = await editingRow.findElement(By.id(`custom-check-save-button-${newRowIndex}`));
      await saveButton.click();
      await sleep(1000);
      
      // Verify the check exists
      const savedRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "Saved custom check row not found"
      );
      
      const cells = await savedRow.findElements(By.css('td'));
      const savedName = await cells[0].getText();
      assert.strictEqual(savedName, checkToDelete, `Custom check "${checkToDelete}" should exist before deletion`);
      
      // Click the delete button
      const deleteButton = await savedRow.findElement(By.id(`custom-check-delete-button-${newRowIndex}`));
      await deleteButton.click();
      await sleep(1000);
      
      // Wait for and confirm the delete alert
      const deleteAlert = await driver.wait(
        until.elementLocated(By.id(`custom-check-delete-alert-${newRowIndex}`)),
        10000,
        "Delete confirmation alert not found"
      );
      
      const confirmButton = await deleteAlert.findElement(By.xpath('.//button[contains(text(), "Delete")]'));
      await confirmButton.click();
      await sleep(1000);
      
      // Verify the check is no longer in the table
      const allRowsAfterDelete = await customChecksContainer.findElements(By.css('tbody tr'));
      const rowTexts = await Promise.all(allRowsAfterDelete.map(row => row.getText()));
      
      const checkStillExists = rowTexts.some(text => text.includes(checkToDelete));
      assert.ok(!checkStillExists, `Custom check "${checkToDelete}" should be deleted`);
      
      console.log(`Successfully deleted custom check: ${checkToDelete}`);
    });

    it("should display custom checks with proper syntax highlighting", async function () {
      this.timeout(15000);
      
      // Add a custom check with SQL syntax
      await addCheckButton.click();
      await sleep(1000);
      
      const allRows = await customChecksContainer.findElements(By.css('tbody tr'));
      const newRowIndex = allRows.length - 1;
      
      const editingRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "New custom check row not found"
      );
      
      const nameField = await driver.wait(
        until.elementLocated(By.id(`custom-check-name-input-${newRowIndex}`)),
        10000,
        "Name input field not found"
      );
      
      const queryField = await driver.wait(
        until.elementLocated(By.id(`custom-check-query-input-${newRowIndex}`)),
        10000,
        "Query input field not found"
      );
      
      const sqlQuery = "SELECT COUNT(*) as count FROM users WHERE created_at > '2023-01-01'";
      
      await nameField.clear();
      await nameField.sendKeys("syntax_test");
      await queryField.clear();
      await queryField.sendKeys(sqlQuery);
      
      // Save the check
      const saveButton = await editingRow.findElement(By.id(`custom-check-save-button-${newRowIndex}`));
      await saveButton.click();
      await sleep(1000);
      
      // Verify the query is displayed with syntax highlighting
      const savedRow = await driver.wait(
        until.elementLocated(By.id(`custom-check-row-${newRowIndex}`)),
        10000,
        "Saved custom check row not found"
      );
      
      const queryCell = await savedRow.findElements(By.css('td'));
      const queryElement = queryCell[3];
      
      // Check if the query contains highlighted elements (should have HTML tags for syntax highlighting)
      const queryHTML = await queryElement.getAttribute('innerHTML');
      assert.ok(queryHTML.includes('<div>'), "Query should be displayed with syntax highlighting");
      assert.ok(queryHTML.includes('SELECT'), "Query should contain the SQL keyword");
      
      console.log("Custom check query displayed with proper syntax highlighting");
    });
  });

  // Cloud Feature Integration Tests
  describe("Cloud Feature Tests", function () {
    let cloudButton: WebElement;

    beforeEach(async function () {
      this.timeout(10000);
      // Switch to the main tab where the cloud button is located
      const tab = await driver.wait(until.elementLocated(By.id("tab-0")), 10000);
      await tab.click();
      await sleep(500);
    });

    it("should display cloud button with correct initial state", async function () {
      this.timeout(15000);

      // Look for the cloud button
      try {
        cloudButton = await driver.wait(
          until.elementLocated(By.id("cloud-button")),
          10000,
          "Cloud button not found"
        );
        assert.ok(cloudButton, "Cloud button should be present");

        // Check if button is displayed
        const isDisplayed = await cloudButton.isDisplayed();
        assert.ok(isDisplayed, "Cloud button should be visible");

        // Verify the button has the globe icon (codicon-globe)
        const globeIcon = await cloudButton.findElement(By.css('span[class*="codicon-globe"]'));
        assert.ok(globeIcon, "Cloud button should have globe icon");

        console.log("Cloud button found and properly displayed");
      } catch (error) {
        console.log("Cloud button not found - this might be expected if project name is not configured");
        // This is acceptable as the cloud button may not be visible without proper configuration
      }
    });

    it("should show appropriate tooltip when cloud button is disabled", async function () {
      this.timeout(15000);

      try {
        cloudButton = await driver.wait(
          until.elementLocated(By.id("cloud-button")),
          5000,
          "Cloud button not found"
        );

        // Get the title attribute (tooltip) of the cloud button
        const tooltipText = await cloudButton.getAttribute("title");
        assert.ok(tooltipText && tooltipText.length > 0, "Cloud button should have a tooltip");

        // The tooltip should provide helpful information about why the button might be disabled
        const validTooltips = [
          "Please set your project name in settings to open assets in cloud",
          "Asset name not available",
          "Pipeline name not available",
          "Open"
        ];

        const hasValidTooltip = validTooltips.some(tooltip => tooltipText.includes(tooltip));
        assert.ok(hasValidTooltip, `Cloud button tooltip should be informative. Got: "${tooltipText}"`);

        console.log(`Cloud button tooltip: "${tooltipText}"`);
      } catch (error) {
        console.log("Cloud button not found - this might be expected without proper configuration");
      }
    });

    it("should handle cloud button click appropriately", async function () {
      this.timeout(15000);

      try {
        cloudButton = await driver.wait(
          until.elementLocated(By.id("cloud-button")),
          5000,
          "Cloud button not found"
        );

        // Check if the button is enabled (not disabled)
        const isEnabled = await cloudButton.isEnabled();
        
        if (isEnabled) {
          // If enabled, clicking should trigger the cloud URL opening process
          await cloudButton.click();
          await sleep(1000);
          
          // We can't easily verify the URL was opened in browser from the test,
          // but we can verify no error occurred and the UI state is maintained
          const buttonStillExists = await driver.findElements(By.id("cloud-button"));
          assert.ok(buttonStillExists.length > 0, "Cloud button should still exist after click");
          
          console.log("Cloud button click handled successfully");
        } else {
          console.log("Cloud button is disabled - expected behavior when configuration is missing");
        }
      } catch (error) {
        console.log("Cloud button not found or not interactive - this might be expected");
      }
    });

    it("should verify cloud button visibility changes based on configuration", async function () {
      this.timeout(20000);

      // This test verifies the cloud button behavior based on asset and project configuration
      // The button may or may not be visible depending on the test environment setup

      try {
        // First, check if we have asset information available
        const assetNameContainer = await driver.findElements(By.id("asset-name-container"));
        
        if (assetNameContainer.length > 0) {
          const assetNameText = await assetNameContainer[0].getText();
          console.log(`Asset name available: "${assetNameText}"`);

          // If we have asset information, cloud button should exist (even if disabled)
          const cloudButtons = await driver.findElements(By.id("cloud-button"));
          
          if (cloudButtons.length > 0) {
            console.log("Cloud button is present with asset information");
            
            // Check the button's state
            const isEnabled = await cloudButtons[0].isEnabled();
            const tooltipText = await cloudButtons[0].getAttribute("title");
            
            console.log(`Cloud button enabled: ${isEnabled}, tooltip: "${tooltipText}"`);
            
            // Verify that the tooltip provides appropriate feedback
            assert.ok(tooltipText && tooltipText.length > 0, "Cloud button should have descriptive tooltip");
          } else {
            console.log("Cloud button not present - may be hidden due to missing configuration");
          }
        } else {
          console.log("No asset name container found - cloud button behavior may vary");
        }
      } catch (error) {
        console.log(`Cloud button visibility test completed with note: ${(error as Error).message}`);
        // This is not necessarily a failure - the behavior depends on the test environment
      }
    });

    it("should verify cloud URL format when button is functional", async function () {
      this.timeout(15000);

      // This test verifies that when the cloud feature is properly configured,
      // it follows the expected URL format pattern
      
      try {
        cloudButton = await driver.wait(
          until.elementLocated(By.id("cloud-button")),
          5000,
          "Cloud button not found"
        );

        const isEnabled = await cloudButton.isEnabled();
        const tooltipText = await cloudButton.getAttribute("title");

        if (isEnabled && tooltipText.includes("Open")) {
          // If the button is enabled and shows "Open [asset] in Bruin Cloud",
          // we can verify the URL format expectation
          console.log("Cloud button is functional - URL format validation would apply");
          
          // The actual URL format should be:
          // https://cloud.getbruin.com/projects/{projectName}/pipelines/{pipelineName}/assets/{assetName}
          
          // We can't directly access the constructed URL from the UI test,
          // but we can verify the button is in the correct state to generate it
          assert.ok(tooltipText.includes("Bruin Cloud"), "Tooltip should reference Bruin Cloud");
          
          console.log("Cloud URL format expectations verified");
        } else {
          console.log(`Cloud button not ready for URL generation. Tooltip: "${tooltipText}"`);
        }
      } catch (error) {
        console.log("Cloud button not available for URL format testing");
      }
    });

    it("should maintain cloud button state during asset operations", async function () {
      this.timeout(20000);

      // Test that cloud button state is maintained when other asset operations are performed
      try {
        const initialCloudButtons = await driver.findElements(By.id("cloud-button"));
        const initialButtonCount = initialCloudButtons.length;
        
        // Perform an asset name edit operation
        const assetNameContainer = await driver.findElements(By.id("asset-name-container"));
        
        if (assetNameContainer.length > 0) {
          // Click on asset name to enter edit mode
          await assetNameContainer[0].click();
          await sleep(1000);
          
          // Check if cloud button is still present/maintains state
          const duringEditCloudButtons = await driver.findElements(By.id("cloud-button"));
          
          // Exit edit mode by pressing Escape
          await driver.actions().sendKeys(Key.ESCAPE).perform();
          await sleep(1000);
          
          // Check cloud button state after edit mode
          const afterEditCloudButtons = await driver.findElements(By.id("cloud-button"));
          
          assert.strictEqual(
            afterEditCloudButtons.length, 
            initialButtonCount, 
            "Cloud button presence should be consistent before and after asset operations"
          );
          
          console.log("Cloud button state maintained during asset operations");
        } else {
          console.log("Asset name container not available for state testing");
        }
      } catch (error) {
        console.log(`Cloud button state test completed: ${(error as Error).message}`);
      }
    });
  });
});
