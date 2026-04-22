const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

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
    width: 1220,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "AutoQA",
    backgroundColor: "#f5f7fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
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
