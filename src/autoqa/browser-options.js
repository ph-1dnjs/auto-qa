const supportedPlatforms = ["darwin", "win32", "linux"];

const browserCatalog = [
  { id: "chromium", label: "Chromium (기본)", browserName: "chromium" },
  { id: "chrome", label: "Google Chrome", browserName: "chromium", channel: "chrome" },
  { id: "chrome-beta", label: "Google Chrome Beta", browserName: "chromium", channel: "chrome-beta" },
  { id: "chrome-dev", label: "Google Chrome Dev", browserName: "chromium", channel: "chrome-dev" },
  { id: "chrome-canary", label: "Google Chrome Canary", browserName: "chromium", channel: "chrome-canary" },
  { id: "msedge", label: "Microsoft Edge", browserName: "chromium", channel: "msedge" },
  { id: "msedge-beta", label: "Microsoft Edge Beta", browserName: "chromium", channel: "msedge-beta" },
  { id: "msedge-dev", label: "Microsoft Edge Dev", browserName: "chromium", channel: "msedge-dev" },
  {
    id: "msedge-canary",
    label: "Microsoft Edge Canary",
    browserName: "chromium",
    channel: "msedge-canary",
    platforms: ["darwin", "win32"],
  },
  { id: "firefox", label: "Firefox (Playwright)", browserName: "firefox" },
  { id: "moz-firefox", label: "Mozilla Firefox", browserName: "firefox", channel: "moz-firefox" },
  { id: "moz-firefox-beta", label: "Mozilla Firefox Beta", browserName: "firefox", channel: "moz-firefox-beta" },
  {
    id: "moz-firefox-nightly",
    label: "Mozilla Firefox Nightly",
    browserName: "firefox",
    channel: "moz-firefox-nightly",
  },
  { id: "webkit", label: "WebKit", browserName: "webkit" },
];

function getSupportedBrowserOptions(platform = process.platform) {
  return browserCatalog
    .filter((browser) => (browser.platforms || supportedPlatforms).includes(platform))
    .map((browser) => ({ ...browser }));
}

function getDefaultBrowserId(platform = process.platform) {
  return getSupportedBrowserOptions(platform)[0]?.id || "chromium";
}

function resolveBrowserOption(browserId, platform = process.platform) {
  const supported = getSupportedBrowserOptions(platform);
  const selected = supported.find((browser) => browser.id === browserId);
  if (selected) return selected;

  const fallback = supported.find((browser) => browser.id === getDefaultBrowserId(platform));
  if (!fallback) {
    throw new Error("현재 플랫폼에서 사용할 수 있는 브라우저가 없습니다.");
  }
  return fallback;
}

function getChromiumFallbackOptions(platform = process.platform) {
  return getSupportedBrowserOptions(platform)
    .filter((browser) => browser.browserName === "chromium" && browser.channel && ["chrome", "msedge"].includes(browser.channel));
}

module.exports = {
  getChromiumFallbackOptions,
  getDefaultBrowserId,
  getSupportedBrowserOptions,
  resolveBrowserOption,
};
