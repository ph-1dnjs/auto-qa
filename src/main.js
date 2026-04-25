const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const packagedBrowserPath = app.isPackaged
  ? path.join(process.resourcesPath, "playwright-browsers")
  : "";
if (packagedBrowserPath && hasUsablePackagedBrowser(packagedBrowserPath)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = packagedBrowserPath;
}

const { runAutoQa } = require("./autoqa/runner");
const { analyzeImpact, buildFeatureMap, prepareScenarios } = require("./autoqa/planner");
const { appendHistory, loadHistory, summarizeHistory } = require("./autoqa/history");

let mainWindow;
const activeRuns = new Map();
let lastUpdateState = null;
const historyFilePath = () => path.join(app.getPath("userData"), "history", "runs.json");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1680,
    height: 1050,
    minWidth: 980,
    minHeight: 680,
    title: "AutoQA",
    backgroundColor: "#08102f",
    ...(process.platform === "darwin"
      ? {
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 16, y: 14 },
      }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    if (lastUpdateState) mainWindow?.webContents.send("app:update-state", lastUpdateState);
  });
}

app.whenReady().then(() => {
  createWindow();
  initializeAutoUpdate();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("scenario:open", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "QA 시나리오 파일 선택",
    properties: ["openFile"],
    filters: [
      { name: "Scenario files", extensions: ["md", "txt", "json", "yml", "yaml", "csv"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  return { filePath, content };
});

ipcMain.handle("scenario:save", async (_event, payload) => {
  const content = String(payload?.content || "").trimEnd();
  if (!content) throw new Error("저장할 시나리오가 없습니다.");

  const title = payload?.title || extractScenarioTitle(content) || "autoqa-scenario";
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "QA 시나리오 저장",
    defaultPath: `${sanitizeFileName(title)}.md`,
    filters: [
      { name: "Markdown", extensions: ["md"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled || !result.filePath) return null;

  const filePath = path.extname(result.filePath)
    ? result.filePath
    : `${result.filePath}.md`;
  await fs.writeFile(filePath, `${content}\n`, "utf8");
  return { filePath };
});

ipcMain.handle("scenario:insights", async (_event, payload) => {
  const scenarios = prepareScenarios(payload?.scenarioText || "");
  const impacted = analyzeImpact(scenarios, payload?.changedText || "");
  return {
    scenarioCount: scenarios.length,
    features: buildFeatureMap(scenarios),
    impacted
  };
});

ipcMain.handle("qa:history", async () => {
  const history = await loadHistory(historyFilePath());
  return summarizeHistory(history);
});

ipcMain.handle("app:update-check", async () => {
  if (!canUseAutoUpdate()) return { enabled: false };
  const result = await autoUpdater.checkForUpdates();
  return { enabled: true, versionInfo: result?.updateInfo || null };
});

ipcMain.handle("app:update-install", async () => {
  if (!canUseAutoUpdate()) return false;
  setUpdateState({ type: "installing", message: "업데이트 설치를 위해 앱을 재시작합니다." });
  setImmediate(() => autoUpdater.quitAndInstall());
  return true;
});

ipcMain.handle("scenario:extract-open", async (_event, payload) => {
  const targetUrl = normalizeRecorderUrl(payload?.baseUrl);
  return {
    targetUrl,
    preloadUrl: pathToFileURL(path.join(__dirname, "recorder-preload.js")).toString()
  };
});

ipcMain.on("scenario:extracted", (_event, payload) => {
  mainWindow?.webContents.send("scenario:extracted", payload);
});

ipcMain.on("scenario:recorder-state", (_event, payload) => {
  mainWindow?.webContents.send("scenario:recorder-state", payload);
});

ipcMain.handle("qa:run", async (_event, payload) => {
  const runId = payload.runId || `run-${Date.now()}`;
  const cancellationToken = { cancelled: false, browser: null };
  activeRuns.set(runId, cancellationToken);

  const reportsDir = path.join(app.getPath("userData"), "reports");
  const artifactsDir = path.join(reportsDir, `run-${Date.now()}`);
  await fs.mkdir(artifactsDir, { recursive: true });

  try {
    const result = await runAutoQa({
      ...payload,
      runId,
      artifactsDir,
      cancellationToken,
      onProgress: (progress) => {
        mainWindow?.webContents.send("qa:progress", { runId, ...progress });
      }
    });

    await appendHistory(historyFilePath(), result);

    return result;
  } finally {
    activeRuns.delete(runId);
  }
});

ipcMain.handle("qa:cancel", async (_event, runId) => {
  const token = activeRuns.get(runId);
  if (!token) return false;
  token.cancelled = true;
  await token.browser?.close().catch(() => {});
  return true;
});

ipcMain.handle("report:open", async (_event, filePath) => {
  if (!filePath) return false;
  await shell.openPath(filePath);
  return true;
});

function normalizeRecorderUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("시나리오 추출 대상 URL을 입력하세요.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function initializeAutoUpdate() {
  if (!canUseAutoUpdate()) {
    setUpdateState({ type: "disabled", message: "개발 모드에서는 자동 업데이트를 사용하지 않습니다." });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({ type: "checking", message: "업데이트를 확인하고 있습니다." });
  });

  autoUpdater.on("update-available", (info) => {
    setUpdateState({
      type: "available",
      message: `새 버전 ${info.version} 다운로드를 시작합니다.`,
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setUpdateState({ type: "idle", message: "최신 버전을 사용 중입니다." });
  });

  autoUpdater.on("download-progress", (progress) => {
    setUpdateState({
      type: "downloading",
      message: `업데이트 다운로드 중 ${Math.round(progress.percent || 0)}%`,
      progress: Math.round(progress.percent || 0),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setUpdateState({
      type: "downloaded",
      message: `새 버전 ${info.version} 다운로드 완료. 재시작하면 설치됩니다.`,
      version: info.version,
    });
  });

  autoUpdater.on("error", (error) => {
    setUpdateState({
      type: "error",
      message: error?.message || "업데이트 확인 중 오류가 발생했습니다.",
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      setUpdateState({
        type: "error",
        message: error?.message || "업데이트 확인 중 오류가 발생했습니다.",
      });
    });
  }, 2500);
}

function canUseAutoUpdate() {
  return app.isPackaged && !process.mas;
}

function setUpdateState(state) {
  lastUpdateState = state;
  mainWindow?.webContents.send("app:update-state", state);
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
    const chromiumDir = process.arch === "arm64" ? "chrome-win" : "chrome-win";
    return [
      {
        prefix: "chromium_headless_shell-",
        executableParts: [shellDir, "chrome-headless-shell.exe"],
      },
      {
        prefix: "chromium-",
        executableParts: [chromiumDir, "chrome.exe"],
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
