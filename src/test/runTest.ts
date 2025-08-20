import { runTests } from "@vscode/test-electron";
import * as path from "path";

async function main(): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      // Keep Code version aligned with CI logs; omit to use latest stable if preferred
      version: "1.100.0",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to run tests:", err);
    process.exit(1);
  }
}

main();
