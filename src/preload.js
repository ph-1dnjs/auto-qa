const { contextBridge, ipcRenderer } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function normalizeRecorderUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("시나리오 추출 대상 URL을 입력하세요.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const extractorPreloadUrl = pathToFileURL(path.join(__dirname, "recorder-preload.js")).toString();

contextBridge.exposeInMainWorld("autoqa", {
  openScenario: () => ipcRenderer.invoke("scenario:open"),
  saveScenario: (payload) => ipcRenderer.invoke("scenario:save", payload),
  analyzeScenario: (payload) => ipcRenderer.invoke("scenario:insights", payload),
  listBrowsers: () => ipcRenderer.invoke("qa:browsers"),
  openScenarioExtractor: (payload) => ({
    targetUrl: normalizeRecorderUrl(payload?.baseUrl),
    preloadUrl: extractorPreloadUrl,
  }),
  checkForAppUpdate: () => ipcRenderer.invoke("app:update-check"),
  installAppUpdate: () => ipcRenderer.invoke("app:update-install"),
  loadHistory: () => ipcRenderer.invoke("qa:history"),
  run: (payload) => ipcRenderer.invoke("qa:run", payload),
  cancel: (runId) => ipcRenderer.invoke("qa:cancel", runId),
  exportFailures: (payload) => ipcRenderer.invoke("qa:export-failures", payload),
  downloadRunVideos: (payload) => ipcRenderer.invoke("qa:download-videos", payload),
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
