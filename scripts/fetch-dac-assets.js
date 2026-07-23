#!/usr/bin/env node
/**
 * Fetches dac's built frontend from the pinned GitHub release (package.json
 * `dacFrontend`) into webview-ui/build/dac-spa. Needs no local dac checkout, so
 * it works in CI. Prefers the `gh` CLI, falls back to `curl`; override the
 * version with DAC_FRONTEND_VERSION.
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const tar = require("tar");
const { execFileSync } = require("child_process");

const pkg = require("../package.json");
const cfg = pkg.dacFrontend || {};
const REPO = process.env.DAC_FRONTEND_REPO || cfg.repo;
const VERSION = process.env.DAC_FRONTEND_VERSION || cfg.version;
const ASSET = process.env.DAC_FRONTEND_ASSET || cfg.asset || "dac-frontend.tar.gz";

const destDir = path.join(__dirname, "..", "webview-ui", "build", "dac-spa");

function has(cmd) {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function download(tmpFile) {
  // Prefer the direct release URL: it serves the public asset without touching
  // api.github.com, so it avoids the unauthenticated rate limit `gh release
  // download` hits in CI. Fall back to gh for private/edge cases.
  const url = `https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}`;
  try {
    execFileSync("curl", ["-fsSL", url, "-o", tmpFile], { stdio: "inherit" });
  } catch (err) {
    if (!has("gh")) {
      throw err;
    }
    console.log("curl download failed; retrying via gh...");
    execFileSync(
      "gh",
      ["release", "download", VERSION, "--repo", REPO, "--pattern", ASSET, "--output", tmpFile, "--clobber"],
      { stdio: "inherit" }
    );
  }
}

async function main() {
  if (!REPO || !VERSION) {
    throw new Error(
      "Missing dac frontend pin. Set package.json `dacFrontend.repo` and `dacFrontend.version` " +
        "(or DAC_FRONTEND_REPO / DAC_FRONTEND_VERSION)."
    );
  }

  const tmpFile = path.join(os.tmpdir(), `dac-frontend-${VERSION.replace(/[^\w.-]/g, "_")}.tar.gz`);
  console.log(`Fetching ${REPO}@${VERSION} (${ASSET})...`);
  download(tmpFile);

  await fs.remove(destDir);
  await fs.ensureDir(destDir);
  // Extract with the tar library rather than system tar — GNU tar on Windows
  // mangles the drive-letter/backslash paths, so shelling out isn't portable.
  await tar.x({ file: tmpFile, cwd: destDir });
  await fs.remove(tmpFile);

  if (!fs.existsSync(path.join(destDir, "index.html"))) {
    throw new Error(
      `Extracted archive has no index.html at its root. The release asset must be built with ` +
        `\`tar -czf ${ASSET} -C frontend/dist .\``
    );
  }
  console.log(`dac frontend ${VERSION} → ${path.relative(process.cwd(), destDir)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
