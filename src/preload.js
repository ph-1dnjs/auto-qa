const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("autoqa", {
  openScenario: () => ipcRenderer.invoke("scenario:open"),
  saveScenario: (payload) => ipcRenderer.invoke("scenario:save", payload),
  openScenarioExtractor: (payload) => ipcRenderer.invoke("scenario:extract-open", payload),
  checkForAppUpdate: () => ipcRenderer.invoke("app:update-check"),
  installAppUpdate: () => ipcRenderer.invoke("app:update-install"),
  run: (payload) => ipcRenderer.invoke("qa:run", payload),
  cancel: (runId) => ipcRenderer.invoke("qa:cancel", runId),
  openReport: (filePath) => ipcRenderer.invoke("report:open", filePath),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("qa:progress", listener);
    return () => ipcRenderer.removeListener("qa:progress", listener);
  },
  onScenarioExtracted: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("scenario:extracted", listener);
    return () => ipcRenderer.removeListener("scenario:extracted", listener);
  },
  onRecorderState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("scenario:recorder-state", listener);
    return () => ipcRenderer.removeListener("scenario:recorder-state", listener);
  },
  onAppUpdateState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("app:update-state", listener);
    return () => ipcRenderer.removeListener("app:update-state", listener);
  }
});
