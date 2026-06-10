const { app, shell, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");

const { registerIpcHandlers } = require("./main/ipc");
const { createUpdateManager } = require("./main/update-manager");
const { hasUsablePackagedBrowser } = require("./main/utils");
const { createMainWindow } = require("./main/window");

let mainWindow;

const updateManager = createUpdateManager({
  app,
  autoUpdater,
  getMainWindow: () => mainWindow,
});

const packagedBrowserPath = app.isPackaged
  ? path.join(process.resourcesPath, "playwright-browsers")
  : "";
if (packagedBrowserPath && hasUsablePackagedBrowser(packagedBrowserPath)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = packagedBrowserPath;
}

registerIpcHandlers({
  app,
  dialog,
  ipcMain,
  shell,
  getMainWindow: () => mainWindow,
  updateManager,
});

app.whenReady().then(() => {
  mainWindow = createMainWindow({
    getLastUpdateState: updateManager.getLastUpdateState,
  });
  updateManager.initializeAutoUpdate();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow({
      getLastUpdateState: updateManager.getLastUpdateState,
    });
  }
});
