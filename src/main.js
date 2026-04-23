const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const packagedBrowserPath = app.isPackaged
  ? path.join(process.resourcesPath, "playwright-browsers")
  : "";
if (packagedBrowserPath && fsSync.existsSync(packagedBrowserPath)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = packagedBrowserPath;
}

const { runAutoQa } = require("./autoqa/runner");

let mainWindow;
const activeRuns = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1680,
    height: 1050,
    minWidth: 980,
    minHeight: 680,
    title: "AutoQA",
    backgroundColor: "#f5f7fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);

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
