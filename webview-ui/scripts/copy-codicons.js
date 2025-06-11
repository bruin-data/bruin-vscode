const fs = require('fs-extra');
const path = require('path');

// Copy codicons font file to build directory
async function copyCodiconsFont() {
  const sourcePath = path.resolve(__dirname, '../node_modules/@vscode/codicons/dist/codicon.ttf');
  const destPath = path.resolve(__dirname, '../build/assets/codicon.ttf');
  const cssSource = path.resolve(__dirname, '../node_modules/@vscode/codicons/dist/codicon.css');
  const cssDest = path.resolve(__dirname, '../build/assets/codicon.css');

  try {
    await fs.copy(sourcePath, destPath);
    console.log('Codicons font copied successfully');
    await fs.copy(cssSource, cssDest);
    console.log('Codicons CSS copied successfully');
  } catch (err) {
    console.error('Error copying codicons assets:', err);
  }
}

copyCodiconsFont();