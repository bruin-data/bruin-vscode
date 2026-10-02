// Launch an isolated extension host; see README.md for setup.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const dir = process.env.PERF_DIR || path.join(root, ".context/perf");
const userDir = path.join(dir, "vscode-user");
fs.mkdirSync(path.join(userDir, "User"), { recursive: true });
const settingsPath = path.join(userDir, "User/settings.json");
if (!fs.existsSync(settingsPath))
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        "bruin.telemetry.enabled": false,
        "bruin.cli.autoUpdate": false,
        "workbench.startupEditor": "none",
        "extensions.autoUpdate": false,
        "update.mode": "none",
        "telemetry.telemetryLevel": "off",
        "window.restoreWindows": "none",
      },
      null,
      2
    )
  );
const log = fs.openSync(path.join(dir, "vscode.log"), "w");
const child = spawn(
  process.env.CODE_BIN || "/Applications/Visual Studio Code.app/Contents/MacOS/Code",
  [
    "--new-window",
    `--user-data-dir=${userDir}`,
    `--extensions-dir=${path.join(dir, "extensions")}`,
    `--extensionDevelopmentPath=${root}`,
    `--extensionTestsPath=${path.join(__dirname, "driver.cjs")}`,
    `--remote-debugging-port=${process.env.PERF_PORT || 9333}`,
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--skip-welcome",
    "--skip-release-notes",
    "--disable-workspace-trust",
    path.join(dir, "pipeline-100"),
  ],
  { cwd: root, env: process.env, stdio: ["ignore", log, log] }
);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  fs.closeSync(log);
  process.exitCode = code || 0;
});
console.log(`Extension host log: ${path.join(dir, "vscode.log")}`);
