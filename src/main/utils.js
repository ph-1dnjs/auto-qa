const fsSync = require("node:fs");
const path = require("node:path");

function normalizeRecorderUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("시나리오 추출 대상 URL을 입력하세요.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractScenarioTitle(content) {
  const match = content.match(/^(?:#{1,3}\s*)?(?:시나리오|Scenario)\s*:\s*(.+)$/im);
  return match?.[1]?.trim();
}

function sanitizeFileName(value) {
  return String(value || "autoqa-scenario")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "autoqa-scenario";
}

function hasUsablePackagedBrowser(rootPath) {
  if (!fsSync.existsSync(rootPath)) return false;
  const entries = fsSync.readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const candidates = getPackagedBrowserCandidates();
  return entries.some((entry) =>
    candidates.some((candidate) =>
      entry.startsWith(candidate.prefix)
      && fsSync.existsSync(path.join(rootPath, entry, ...candidate.executableParts)),
    ),
  );
}

function getPackagedBrowserCandidates() {
  if (process.platform === "win32") {
    const shellDir = process.arch === "arm64"
      ? "chrome-headless-shell-win32-arm64"
      : "chrome-headless-shell-win64";
    return [
      {
        prefix: "chromium_headless_shell-",
        executableParts: [shellDir, "chrome-headless-shell.exe"],
      },
      {
        prefix: "chromium-",
        executableParts: ["chrome-win", "chrome.exe"],
      },
    ];
  }

  if (process.platform === "darwin") {
    return [
      {
        prefix: "chromium_headless_shell-",
        executableParts: ["chrome-headless-shell-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
      },
      {
        prefix: "chromium-",
        executableParts: ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
      },
    ];
  }

  return [
    {
      prefix: "chromium_headless_shell-",
      executableParts: ["chrome-headless-shell-linux64", "chrome-headless-shell"],
    },
    {
      prefix: "chromium-",
      executableParts: ["chrome-linux", "chrome"],
    },
  ];
}

module.exports = {
  extractScenarioTitle,
  hasUsablePackagedBrowser,
  normalizeRecorderUrl,
  sanitizeFileName,
};
