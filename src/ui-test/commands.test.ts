import * as assert from "assert";
import { VSBrowser, Workbench, EditorView, TerminalView, InputBox, WebDriver, By, SideBarView, until, Key, error } from "vscode-extension-tester";
import "mocha";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// A helper sleep function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*describe("Sample Command palette tests", function () {
  it("Testing install Bruin CLI command", async function () {
    const workbench = new Workbench();
    await workbench.executeCommand("Install Bruin CLI");
    await sleep(5000);

    const terminalView = await new TerminalView();
    await terminalView.selectChannel("Bruin Terminal");

    // Determine the full path to the bruin executable
    const bruinExecutable =
      process.platform === "win32"
        ? path.join(os.homedir(), ".local", "bin", "bruin.exe")
        : "bruin";

    // Use Git Bash on Windows (skip test in Windows)
    if (process.platform === "win32") {
      this.skip();
    } else {
      await terminalView.executeCommand(`${bruinExecutable} --version`);
    }
    const terminalOutput = await terminalView.getText();
    console.log("Terminal output:", terminalOutput);
    const versionAvailble =
      terminalOutput.includes("Current: ") && terminalOutput.includes("Latest: ");
    assert.strictEqual(versionAvailble, true);
  });

  it("Testing run command with dummy call and delay", async function () {
    let bruinExecutable = "bruin";
    if (process.platform === "win32") {
      bruinExecutable = path.join(os.homedir(), ".local", "bin", "bruin.exe");
    }
    const terminalView = await new TerminalView();
    await terminalView.selectChannel("Bruin Terminal");
    await terminalView.executeCommand(" ");
    await sleep(1000);
    await terminalView.executeCommand(`"${bruinExecutable}" run --help`);
    const terminalOutput = await terminalView.getText();
    console.log("Terminal output:", terminalOutput);
    const helpAvailable = terminalOutput.includes("bruin run - run a Bruin pipeline");
    assert.strictEqual(helpAvailable, true);
  });
});*/

/* describe("Bruin Asset Editor Integration Tests", function () {
  let driver: WebDriver;
  let workbench: Workbench;
  let editorView: EditorView;
  let testWorkspacePath: string;
  let testAssetFilePath: string;

  before(async function () {
    // Increase timeout for the setup
    this.timeout(60000);
    
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    editorView = new EditorView();

    // Set up test workspace and file paths
    testWorkspacePath = path.resolve(__dirname, "test-pipeline", "assets");
    testAssetFilePath = path.join(testWorkspacePath, "example.sql");
    
    // Open the workspace folder using the File menu
    await workbench.executeCommand("workbench.action.files.openFolder");
    await sleep(4000);
    
    // Use WebDriver to input the folder path and confirm
    const folderInputBox = await InputBox.create();
    await folderInputBox.setText(testWorkspacePath);
    await folderInputBox.confirm();
    
    // Allow time for the workspace to load
    await sleep(5000);
  });

  it("should open the asset.sql file correctly", async function () {
    this.timeout(30000);
    
    // Try opening the file using the Quick Open palette (Ctrl+P)
    await workbench.executeCommand("workbench.action.quickOpen");
    await sleep(1000);
    
    const quickOpenBox = await InputBox.create();
    await quickOpenBox.setText(testAssetFilePath);
    await sleep(1000);
    await quickOpenBox.confirm();
    
    // Allow time for the file to open
    await sleep(3000);
    
    // Verify the file is open by checking if there's an active editor
    const editors = await editorView.getOpenEditorTitles();
    assert.ok(editors.some(title => title.includes("example.sql")), 
              "The asset.sql file should be open in the editor");
    
    // Optional: Verify the content is visible
    const editor = await editorView.openEditor("example.sql");
    assert.ok(editor, "Editor for asset.sql should be accessible");
  });
});*/
// Utility function to log available elements
async function logAvailableElements(driver: WebDriver) {
  console.log("Logging available elements...");
  try {
    const bodyElement = await driver.findElement(By.css("body"));
    const html = await bodyElement.getAttribute("innerHTML");
    console.log("Body HTML:", html.substring(0, 1000) + "...");
    
    // Log specific elements you might be looking for
    console.log("Webviews found:", (await driver.findElements(By.css(".webview"))).length);
    console.log("Editors found:", (await driver.findElements(By.css(".editor"))).length);
  } catch (error: any) {
    console.log("Error logging elements:", error.message);
  }
}
describe("Bruin Asset Editor Integration Tests", function () {
  let driver: WebDriver;
  let workbench: Workbench;
  let editorView: EditorView;
  let testWorkspacePath: string;
  let testAssetFilePath: string;

  before(async function () {
    // Increase timeout for the setup
    this.timeout(60000);
    
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    editorView = new EditorView();

    // Set up test workspace and file paths
    testWorkspacePath = path.resolve(__dirname, "test-pipeline", "assets");
    testAssetFilePath = path.join(testWorkspacePath, "example.sql");
        
    // Open the workspace folder
    await workbench.executeCommand("workbench.action.files.openFolder");
    await sleep(4000);
    
    const folderInputBox = await InputBox.create();
    await folderInputBox.setText(testWorkspacePath);
    await folderInputBox.confirm();
    
    // Allow time for the workspace to load
    await sleep(5000);
    
    // Open the file
    await workbench.executeCommand("workbench.action.quickOpen");
    await sleep(1000);
    
    const quickOpenBox = await InputBox.create();
    await quickOpenBox.setText(testAssetFilePath);
    await sleep(1000);
    await quickOpenBox.confirm();
    
    // Allow time for the file to open
    await sleep(3000);
  });

  after(async function () {
    // Clean up - uncomment if you want to delete test files
    /*
    if (fs.existsSync(testAssetFilePath)) {
      fs.unlinkSync(testAssetFilePath);
    }
    */
  });

  it("should render the SQL panel when triggered", async function () {
    this.timeout(30000);
    // Trigger your extension's command to render the SQL panel
    await workbench.executeCommand("bruin.renderSQL");
    await sleep(5000);
    await logAvailableElements(driver);

    // Try to find the webview panel
    try {
      const webviewPanel = await driver.wait(
        until.elementLocated(By.css(".webview.ready, .webview-panel, .monaco-webview-content")),
        10000,
        "Webview not found"  
      );
      console.log("Show all the driver elements :", driver);
      assert.ok(webviewPanel, "Webview panel should be visible");
    } catch (error: any) {
      assert.fail("Failed to find webview panel: " + error.message);
    }
  });

  it("should update asset name from the side panel", async function () {
    this.timeout(60000);
  
    // 1. Open extension
    await workbench.executeCommand("bruin.renderSQL");
    
    // 2. Find and switch to webview frame
    const webview = await driver.wait(
      until.elementLocated(By.css("webview.active-frame")), 
      15000
    );
    await driver.switchTo().frame(webview);
  
    try {
      // 3. Wait for AND get the name container element
      const nameContainer = await driver.wait(
        until.elementLocated(By.id("asset-name-container")),
        10000
      );
  
      // 4. Click using proper element reference
      await driver.actions()
        .move({ origin: nameContainer }) // Use WebElement here
        .click()
        .perform();
  
      // 5. Locate input field
      const nameInput = await driver.wait(
        until.elementLocated(By.id("asset-name-input")),
        5000
      );
  
      // 6. Update name
      const newName = `Updated_${Date.now()}`;
      await nameInput.clear();
      await nameInput.sendKeys(newName, Key.ENTER);
  
      // 7. Verify using displayed text element
      const nameDisplay = await driver.wait(
        until.elementLocated(By.id("input-name")),
        5000
      );
      
      await driver.wait(
        until.elementTextContains(nameDisplay, newName.substring(0, 8)),
        10000
      );
  
    } finally {
      // 8. Always return to main context
      await driver.switchTo().defaultContent();
    }
  
    assert.ok(true, "Name updated successfully");
  });
});


/* describe("Bruin Asset Editor Integration Tests", function () {
  let driver: WebDriver;
  let workbench: Workbench;
  let editorView: EditorView;
  let testWorkspacePath: string;
  let testAssetFilePath: string;
  let testPipelineFilePath: string;

  before(async function () {
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    editorView = new EditorView();

    // Set up test workspace folder under your repository (adjust relative to __dirname)
    // For example: <your_project_root>/test/test-pipeline/assets
    testWorkspacePath = path.join(__dirname, "test-pipeline", "assets");
    testAssetFilePath = path.join(testWorkspacePath, "e.sql");
    await sleep(5000);

   // give the time to the test to create the file

    // Open the test workspace folder in VS Code
    await workbench.executeCommand("workbench.action.files.openFolder");
    await sleep(5000);
    const folderInputBox = await InputBox.create();
    await folderInputBox.setText(testWorkspacePath);
    await folderInputBox.confirm();

    // Allow some time for the workspace to load
    await sleep(2000);

    // Open the asset file so your extension will pick it up
    await workbench.executeCommand("workbench.action.files.openFile");
    const fileInputBox = await InputBox.create();
    await fileInputBox.setText(testAssetFilePath);
    await fileInputBox.confirm();

    // Give some extra time for the file to open and extension to initialize
    await sleep(2000);
  });

  after(async function () {
    // Optionally clean up files after tests (if desired)
    // Comment out if you want to inspect the files manually
    if (fs.existsSync(testAssetFilePath)) {
      fs.unlinkSync(testAssetFilePath);
    }

  });

  // Helper: Wait for the Vue app container (the element with id="app") in the side panel
  async function getAppContainer() {
    // It is assumed that the extension’s render command opens a side panel with a webview.
    // Wait for an element with #app or another unique selector from your Vue app.
    const appContainer = await driver.wait(
      async () => {
        try {
          return await driver.findElement(By.css("#app"));
        } catch (err) {
          return null;
        }
      },
      30000,
      "Timed out waiting for Vue app container (#app)"
    );
    if (!appContainer) {
      throw new Error("Vue app container (#app) not found");
    }
    return appContainer;
  }

  // Trigger the render command that opens the side panel containing your app UI.
  async function triggerRenderCommand() {
    // If your extension exposes a command that renders the side panel,
    // execute that command from the workbench:
    await workbench.executeCommand("bruin.renderSQL"); // Use the exact command name registered by your extension
    // Allow time for the side panel to open and the Vue app to load
    await sleep(3000);
  }

  it("should update asset name from the side panel", async function () {
    // Trigger the render command to open the side panel
    await triggerRenderCommand();

    // Wait for the Vue app container (#app) to load inside the side panel
    const appContainer = await getAppContainer();

    // Locate the asset name display element within your app UI.
    // The element might be a <span> inside a container with known CSS classes.
    const assetNameDisplay = await driver.wait(
      async () => {
        try {
          return await appContainer.findElement(By.css(".font-mono.text-lg.text-editor-fg span.block.truncate"));
        } catch (err) {
          return null;
        }
      },
      10000,
      "Asset name display element not found"
    );
    assert.ok(assetNameDisplay, "Asset name display element exists");

    // Click on the asset name to switch into editing mode.
    await assetNameDisplay.click();

    // Wait for the asset name input element to appear.
    const nameInput = await driver.wait(
      async () => {
        try {
          return await appContainer.findElement(By.css("input.w-full.text-lg.bg-input-background"));
        } catch (err) {
          return null;
        }
      },
      10000,
      "Asset name input element did not appear"
    );
    assert.ok(nameInput, "Asset name input element exists");

    // Clear the input and type a new asset name
    await nameInput.clear();
    const newAssetName = "Updated Asset Name";
    await nameInput.sendKeys(newAssetName, "\n");

    // Wait for the element to switch back to display mode and update the asset name.
    const updatedNameElement = await driver.wait(
      async () => {
        try {
          return await appContainer.findElement(By.css(".font-mono.text-lg.text-editor-fg span.block.truncate"));
        } catch (err) {
          return null;
        }
      },
      10000,
      "Updated asset name element not found"
    );
    if (!updatedNameElement) {
      throw new Error("Updated asset name element not found");
    }
    const displayedName = await updatedNameElement.getText();
    assert.strictEqual(displayedName, newAssetName, "Asset name updated in UI");

    // Verify that the asset file has been updated with the new asset name.
    const fileContent = JSON.parse(fs.readFileSync(testAssetFilePath, "utf8"));
    assert.strictEqual(fileContent.asset.name, newAssetName, "Asset file updated with new asset name");
  });

}); */
