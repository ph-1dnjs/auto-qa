const { BrowserWindow } = require("electron");
const path = require("node:path");

function createMainWindow({ getLastUpdateState }) {
  const mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    const state = getLastUpdateState?.();
    if (state) {
      mainWindow.webContents.send("app:update-state", state);
    }
  });

  return mainWindow;
}

module.exports = {
  createMainWindow,
};
