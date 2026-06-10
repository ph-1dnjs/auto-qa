const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getChromiumFallbackOptions,
  getDefaultBrowserId,
  getSupportedBrowserOptions,
  resolveBrowserOption,
} = require("../src/autoqa/browser-options");

test("returns supported browser options per platform", () => {
  const linuxOptions = getSupportedBrowserOptions("linux");
  assert.equal(linuxOptions.some((browser) => browser.id === "msedge-canary"), false);
  assert.equal(linuxOptions.some((browser) => browser.id === "webkit"), true);
  assert.equal(linuxOptions.some((browser) => browser.id === "moz-firefox-nightly"), true);

  const windowsOptions = getSupportedBrowserOptions("win32");
  assert.equal(windowsOptions.some((browser) => browser.id === "msedge-canary"), true);
});

test("resolves selected browser and falls back to default", () => {
  const selected = resolveBrowserOption("chrome-beta", "darwin");
  assert.equal(selected.id, "chrome-beta");
  assert.equal(selected.browserName, "chromium");

  const fallback = resolveBrowserOption("does-not-exist", "darwin");
  assert.equal(fallback.id, getDefaultBrowserId("darwin"));
});

test("returns chromium fallback channels in priority order", () => {
  const macFallbacks = getChromiumFallbackOptions("darwin");
  assert.deepEqual(macFallbacks.map((browser) => browser.id), ["chrome", "msedge"]);

  const linuxFallbacks = getChromiumFallbackOptions("linux");
  assert.deepEqual(linuxFallbacks.map((browser) => browser.id), ["chrome", "msedge"]);
});
