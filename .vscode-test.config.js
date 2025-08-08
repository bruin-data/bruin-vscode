module.exports = {
  // Use a specific stable version instead of 'max'
  vscodeVersion: '1.100.0',
  
  // Additional settings for better test stability
  launchArgs: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ],
  
  // Try to use system Chrome if available
  chromiumPath: process.env.CHROME_BIN,
  
  // Setup Chrome options for CI environments
  chromeOptions: {
    headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--remote-debugging-port=9222',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'
    ]
  }
};