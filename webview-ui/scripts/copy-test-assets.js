const fs = require('fs-extra');
const path = require('path');

async function copyTestAssets() {
    const sourceTestFolder = path.resolve(__dirname, '../../src/ui-test/test-pipeline');
    const destTestFolder = path.resolve(__dirname, '../build/ui-test/test-pipeline');
    try {
      await fs.copy(sourceTestFolder, destTestFolder);
      console.log('Test assets copied successfully');
    } catch (err) {
      console.error('Error copying test assets:', err);
    }
  }
  
  copyTestAssets();