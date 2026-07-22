// Mocha config for the Selenium (vscode-extension-tester) UI suites.
// These drive a real VS Code + Chrome, so they're prone to environment timing
// flakes (hover tooltips intercepting clicks, zoom controls not yet painted,
// etc.) that are unrelated to correctness. Retry a failing UI test a couple of
// times before failing the build — a genuinely broken test still fails on every
// attempt, but a one-off timing blip no longer blocks CI.
module.exports = {
  timeout: 180000,
  retries: 2,
};
