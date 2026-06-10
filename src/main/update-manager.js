function createUpdateManager({ app, autoUpdater, getMainWindow }) {
  let lastUpdateState = null;

  function canUseAutoUpdate() {
    return app.isPackaged && !process.mas;
  }

  function setUpdateState(state) {
    lastUpdateState = state;
    getMainWindow()?.webContents.send("app:update-state", state);
  }

  function initializeAutoUpdate() {
    if (!canUseAutoUpdate()) {
      setUpdateState({ type: "disabled", message: "개발 모드에서는 자동 업데이트를 사용하지 않습니다." });
      return;
    }

    if (process.platform === "win32") {
      autoUpdater.channel = process.arch === "arm64" ? "arm64" : "x64";
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

  async function checkForUpdates() {
    if (!canUseAutoUpdate()) return { enabled: false };
    const result = await autoUpdater.checkForUpdates();
    return { enabled: true, versionInfo: result?.updateInfo || null };
  }

  async function installUpdate() {
    if (!canUseAutoUpdate()) return false;
    setUpdateState({ type: "installing", message: "업데이트 설치를 위해 앱을 재시작합니다." });
    setImmediate(() => autoUpdater.quitAndInstall());
    return true;
  }

  return {
    checkForUpdates,
    getLastUpdateState: () => lastUpdateState,
    initializeAutoUpdate,
    installUpdate,
  };
}

module.exports = {
  createUpdateManager,
};
