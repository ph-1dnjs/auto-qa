const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("autoqa", {
  openScenario: () => ipcRenderer.invoke("scenario:open"),
  run: (payload) => ipcRenderer.invoke("qa:run", payload),
  cancel: (runId) => ipcRenderer.invoke("qa:cancel", runId),
  openReport: (filePath) => ipcRenderer.invoke("report:open", filePath),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("qa:progress", listener);
    return () => ipcRenderer.removeListener("qa:progress", listener);
  }
});
