/* eslint-disable @typescript-eslint/naming-convention */
import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  normalizeCustomConfigPath,
  setCustomMcpConfig,
  getCustomMcpConfigStatuses,
  removeCustomMcpConfigServers,
} from "../extension/commands/manageMcpIntegrations";

/**
 * Real, runnable coverage for the "Custom MCP config" feature (BRU-5720).
 * These tests exercise the exact functions the extension calls when a user
 * clicks Add / Enable / Disable — pointed at a throwaway temp file instead of a
 * real client's config, so no CoCo / Snowflake / Cursor install is needed.
 */
suite("Custom MCP config", () => {
  let tmpDir: string;
  let configPath: string;

  setup(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bruin-mcp-"));
    // Nested to also prove parent dirs get created on first write.
    configPath = path.join(tmpDir, "client", "mcp.json");
  });

  teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function readConfig(): any {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }

  test("normalizeCustomConfigPath expands ~ and returns an absolute path", () => {
    const expanded = normalizeCustomConfigPath("~/foo/mcp.json");
    assert.strictEqual(expanded, path.join(os.homedir(), "foo", "mcp.json"));
    assert.ok(path.isAbsolute(normalizeCustomConfigPath("./relative/mcp.json")));
  });

  test("enabling (local) writes the Bruin server and creates missing dirs", async () => {
    await setCustomMcpConfig(configPath, "bruin", true);

    const config = readConfig();
    assert.deepStrictEqual(config.mcpServers.bruin, {
      command: "bruin",
      args: ["mcp"],
    });
  });

  test("enabling preserves existing unrelated servers", async () => {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ mcpServers: { other: { command: "other", args: [] } } }, null, 2)
    );

    await setCustomMcpConfig(configPath, "bruin", true);

    const config = readConfig();
    assert.ok(config.mcpServers.other, "existing server should be preserved");
    assert.ok(config.mcpServers.bruin, "bruin server should be added");
  });

  test("status reports configured=true after enabling, false before", async () => {
    const before = await getCustomMcpConfigStatuses([configPath], "bruin");
    assert.strictEqual(before[0].configured, false);
    assert.strictEqual(before[0].exists, false);

    await setCustomMcpConfig(configPath, "bruin", true);

    const after = await getCustomMcpConfigStatuses([configPath], "bruin");
    assert.strictEqual(after[0].configured, true);
    // Status is "ready" when the Bruin CLI is installed, "bruin_missing" otherwise.
    assert.ok(["ready", "bruin_missing"].includes(after[0].status));
  });

  test("disabling (local) removes only the Bruin server", async () => {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ mcpServers: { other: { command: "other", args: [] } } }, null, 2)
    );
    await setCustomMcpConfig(configPath, "bruin", true);

    await setCustomMcpConfig(configPath, "bruin", false);

    const config = readConfig();
    assert.strictEqual(config.mcpServers.bruin, undefined);
    assert.ok(config.mcpServers.other, "unrelated server should remain");
  });

  test("cloud enable writes a bearer-authed streamable-http entry and reports ready", async () => {
    await setCustomMcpConfig(configPath, "cloud", true, "test-token-123");

    const config = readConfig();
    assert.strictEqual(config.mcpServers.bruin_cloud.type, "streamable-http");
    assert.strictEqual(config.mcpServers.bruin_cloud.url, "https://cloud.getbruin.com/mcp");
    assert.strictEqual(
      config.mcpServers.bruin_cloud.headers.Authorization,
      "Bearer test-token-123"
    );

    // Cloud status does not depend on a local CLI, so it is deterministically "ready".
    const status = await getCustomMcpConfigStatuses([configPath], "cloud");
    assert.strictEqual(status[0].configured, true);
    assert.strictEqual(status[0].status, "ready");
  });

  test("cloud enable without a token throws", async () => {
    await assert.rejects(
      () => setCustomMcpConfig(configPath, "cloud", true, "   "),
      /API token is required/
    );
  });

  test("removeCustomMcpConfigServers strips both local and cloud entries", async () => {
    await setCustomMcpConfig(configPath, "bruin", true);
    await setCustomMcpConfig(configPath, "cloud", true, "test-token-123");

    await removeCustomMcpConfigServers(configPath);

    const config = readConfig();
    assert.strictEqual(config.mcpServers.bruin, undefined);
    assert.strictEqual(config.mcpServers.bruin_cloud, undefined);
  });
});
