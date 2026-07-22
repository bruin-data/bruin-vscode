#!/usr/bin/env node
/**
 * Copies dac's built frontend into the extension from a local dac checkout.
 * Usage: node scripts/copy-dac-assets.js [path-to-dac-repo]  (defaults to ../dac)
 */

const fs = require("fs-extra");
const path = require("path");

const DEFAULT_DAC_PATH = path.resolve(__dirname, "../../dac");
const dacPath = process.argv[2] || DEFAULT_DAC_PATH;

// Prefer the relative-path embed build (dist-embed, DAC_EMBED=1); else dist.
const embedDir = path.join(dacPath, "frontend/dist-embed");
const srcDir = fs.existsSync(embedDir) ? embedDir : path.join(dacPath, "frontend/dist");
const destDir = path.join(__dirname, "../webview-ui/build/dac-spa");

async function main() {
  // Check source exists
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: dac frontend embed build not found at ${embedDir}`);
    console.error("Build it first: DAC_EMBED=1 npm run build -- --outDir dist-embed  (in dac/frontend)");
    process.exit(1);
  }

  // Clean destination
  await fs.remove(destDir);
  await fs.ensureDir(destDir);

  // Copy assets
  await fs.copy(srcDir, destDir);

  console.log(`Copied dac frontend assets to ${destDir}`);

  // List main files
  const indexHtml = path.join(destDir, "index.html");
  if (fs.existsSync(indexHtml)) {
    const html = fs.readFileSync(indexHtml, "utf8");
    const jsMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
    const cssMatch = html.match(/href="\/assets\/(index-[^"]+\.css)"/);
    if (jsMatch) console.log(`  Main JS: ${jsMatch[1]}`);
    if (cssMatch) console.log(`  Main CSS: ${cssMatch[1]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
