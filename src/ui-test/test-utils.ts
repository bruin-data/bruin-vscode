/**
 * Test utilities for reliable UI testing
 * Replaces arbitrary sleeps with proper wait conditions
 */

import { WebDriver, By, WebView, VSBrowser, Workbench } from "vscode-extension-tester";
import { until, WebElement } from "selenium-webdriver";

export interface WaitOptions {
  timeout?: number;
  pollInterval?: number;
  message?: string;
}

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_POLL_INTERVAL = 100;

/**
 * Wait for a condition with configurable timeout and polling
 */
export async function waitFor<T>(
  condition: () => Promise<T | null | false>,
  options: WaitOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, pollInterval = DEFAULT_POLL_INTERVAL, message = "Condition not met" } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result !== null && result !== false) {
        return result as T;
      }
    } catch {
      // Continue polling on error
    }
    await sleep(pollInterval);
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

/**
 * Sleep utility - use sparingly, prefer waitFor conditions
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find element with automatic retry on stale element errors
 */
export async function findElementReliably(
  driver: WebDriver,
  locator: By,
  options: WaitOptions = {}
): Promise<WebElement> {
  const { timeout = DEFAULT_TIMEOUT, message = `Element not found: ${locator}` } = options;

  return waitFor(
    async () => {
      try {
        const element = await driver.findElement(locator);
        if (await element.isDisplayed()) {
          return element;
        }
        return null;
      } catch {
        return null;
      }
    },
    { timeout, message }
  );
}

/**
 * Find elements with retry logic
 */
export async function findElementsReliably(
  driver: WebDriver,
  locator: By,
  options: WaitOptions & { minCount?: number } = {}
): Promise<WebElement[]> {
  const { timeout = DEFAULT_TIMEOUT, minCount = 1, message = `Elements not found: ${locator}` } = options;

  return waitFor(
    async () => {
      try {
        const elements = await driver.findElements(locator);
        if (elements.length >= minCount) {
          return elements;
        }
        return null;
      } catch {
        return null;
      }
    },
    { timeout, message }
  );
}

/**
 * Click element with retry on stale element and click interception errors
 */
export async function clickReliably(
  driver: WebDriver,
  elementOrLocator: WebElement | By,
  options: WaitOptions & { maxRetries?: number } = {}
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT, maxRetries = 3 } = options;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const element =
        elementOrLocator instanceof By
          ? await findElementReliably(driver, elementOrLocator, { timeout: timeout / maxRetries })
          : elementOrLocator;

      await driver.wait(until.elementIsVisible(element), 5000);
      await element.click();
      return;
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      const isRetryable =
        err.name === "StaleElementReferenceError" ||
        err.name === "ElementClickInterceptedError" ||
        err.message?.includes("stale");

      if (!isRetryable || attempt === maxRetries || Date.now() - startTime > timeout) {
        // Last resort: JavaScript click
        if (err.name === "ElementClickInterceptedError") {
          console.log("Using JavaScript click as fallback");
          const element =
            elementOrLocator instanceof By
              ? await driver.findElement(elementOrLocator)
              : elementOrLocator;
          await driver.executeScript("arguments[0].click();", element);
          return;
        }
        throw error;
      }

      console.log(`Click attempt ${attempt} failed (${err.name}), retrying...`);
      await sleep(200);
    }
  }
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  driver: WebDriver,
  locator: By,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUT, message = `Element still present: ${locator}` } = options;

  await waitFor(
    async () => {
      const elements = await driver.findElements(locator);
      return elements.length === 0 ? true : null;
    },
    { timeout, message }
  );
}

/**
 * Wait for loading indicators to disappear
 */
export async function waitForLoadingToComplete(driver: WebDriver, options: WaitOptions = {}): Promise<void> {
  const { timeout = 30000 } = options;
  const loadingSelectors = [".spinner", ".animate-spin", '[class*="loading"]', ".loading-overlay"];

  await waitFor(
    async () => {
      for (const selector of loadingSelectors) {
        const elements = await driver.findElements(By.css(selector));
        const visibleElements = await Promise.all(
          elements.map(async (el) => {
            try {
              return await el.isDisplayed();
            } catch {
              return false;
            }
          })
        );
        if (visibleElements.some(Boolean)) {
          return null;
        }
      }
      return true;
    },
    { timeout, message: "Loading indicators still present" }
  );
}

/**
 * Helper to switch to nested webview iframes reliably
 */
export async function switchToWebviewContent(
  driver: WebDriver,
  webview: WebView,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout = 30000 } = options;

  await waitFor(
    async () => {
      try {
        await webview.wait(200);
        return true;
      } catch {
        return null;
      }
    },
    { timeout: 5000, message: "Webview not present in DOM" }
  );

  await webview.switchToFrame();
  console.log("Switched to webview frame");

  const panelIframe = await waitFor(
    async () => {
      try {
        return await driver.findElement(By.css('iframe[src*="extensionId=bruin.bruin"]'));
      } catch {
        return null;
      }
    },
    { timeout, message: "Panel iframe not found" }
  );

  await driver.switchTo().frame(panelIframe);
  console.log("Switched to panel iframe");

  const contentIframe = await waitFor(
    async () => {
      try {
        return await driver.findElement(By.css('iframe[src*="fake.html"]'));
      } catch {
        return null;
      }
    },
    { timeout, message: "Content iframe not found" }
  );

  await driver.switchTo().frame(contentIframe);
  console.log("Switched to content iframe");
}

/**
 * Wait for Vue app to be mounted and ready
 */
export async function waitForVueApp(driver: WebDriver, options: WaitOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;

  await waitFor(
    async () => {
      const app = await driver.findElements(By.css("#app"));
      if (app.length === 0) return null;

      const content = await app[0].getAttribute("innerHTML");
      return content && content.length > 0 ? true : null;
    },
    { timeout, message: "Vue app not mounted" }
  );
}

/**
 * Setup workspace context for tests
 */
export async function setupWorkspaceContext(
  workspacePath: string,
  configPath?: string,
  pipelinePath?: string
): Promise<void> {
  await VSBrowser.instance.openResources(workspacePath);
  console.log("Opened workspace");

  // Wait for workspace to be recognized
  await waitFor(
    async () => {
      try {
        const driver = VSBrowser.instance.driver;
        // Check if workspace is loaded by looking for any VS Code UI element
        const elements = await driver.findElements(By.css(".monaco-workbench"));
        return elements.length > 0 ? true : null;
      } catch {
        return null;
      }
    },
    { timeout: 10000, message: "Workspace not loaded" }
  );

  if (configPath) {
    await VSBrowser.instance.openResources(configPath);
    console.log("Opened config file");
    await sleep(500);
  }

  if (pipelinePath) {
    await VSBrowser.instance.openResources(pipelinePath);
    console.log("Opened pipeline file");
    await sleep(500);
  }
}

/**
 * Close all editors and clean up walkthrough windows
 */
export async function cleanupEditors(workbench: Workbench): Promise<void> {
  const unwantedPatterns = [
    "Walkthrough",
    "Welcome",
    "Getting Started",
    "Setup VS Code",
    "Extension",
    "Learn",
    "Tutorial",
    "Overview",
  ];

  const closeCommands = [
    "workbench.action.closeAllEditors",
    "workbench.action.closeWalkthrough",
    "workbench.welcome.close",
  ];

  for (const command of closeCommands) {
    try {
      await workbench.executeCommand(command);
    } catch {
      // Command may not exist
    }
  }

  await sleep(300);

  try {
    const editorView = workbench.getEditorView();
    const titles = await editorView.getOpenEditorTitles();

    for (const title of titles) {
      const isUnwanted = unwantedPatterns.some((p) => title.toLowerCase().includes(p.toLowerCase()));
      if (isUnwanted) {
        try {
          await editorView.closeEditor(title);
        } catch {
          // Editor may already be closed
        }
      }
    }
  } catch {
    // Editor view operations may fail
  }
}

/**
 * Wait for query execution to complete (loading gone, results or error present)
 */
export async function waitForQueryCompletion(driver: WebDriver, options: WaitOptions = {}): Promise<"success" | "error"> {
  const { timeout = 30000 } = options;

  await waitForLoadingToComplete(driver, { timeout });

  const result = await waitFor(
    async () => {
      const tables = await driver.findElements(By.css("table, .table"));
      const errors = await driver.findElements(By.css('.text-errorForeground, [class*="error"]'));

      if (tables.length > 0) return "success" as const;
      if (errors.length > 0) return "error" as const;
      return null;
    },
    { timeout: 5000, message: "Query results not found" }
  );

  return result;
}

/**
 * Execute script with retry on stale element
 */
export async function executeScriptReliably(
  driver: WebDriver,
  script: string,
  ...args: unknown[]
): Promise<unknown> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await driver.executeScript(script, ...args);
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === "StaleElementReferenceError" && attempt < maxRetries) {
        await sleep(100);
        continue;
      }
      throw error;
    }
  }
}

/**
 * Check if an element exists without throwing
 */
export async function elementExists(driver: WebDriver, locator: By): Promise<boolean> {
  try {
    const elements = await driver.findElements(locator);
    return elements.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get text from element with retry
 */
export async function getTextReliably(
  driver: WebDriver,
  locator: By,
  options: WaitOptions = {}
): Promise<string> {
  const element = await findElementReliably(driver, locator, options);

  return waitFor(
    async () => {
      try {
        const text = await element.getText();
        return text;
      } catch {
        return null;
      }
    },
    { timeout: options.timeout || 5000, message: "Could not get element text" }
  );
}
