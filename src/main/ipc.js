const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { appendHistory, loadHistory, summarizeHistory } = require("../autoqa/history");
const { getDefaultBrowserId, getSupportedBrowserOptions } = require("../autoqa/browser-options");
const { getFailureExportDefaultName, writeFailureExport } = require("../autoqa/failure-export");
const { analyzeImpact, buildFeatureMap, prepareScenarios } = require("../autoqa/planner");
const { runAutoQa } = require("../autoqa/runner");
const { loadScenarioFileContent } = require("../autoqa/scenario-import");
const { extractScenarioTitle, normalizeRecorderUrl, sanitizeFileName } = require("./utils");

function registerIpcHandlers({ app, dialog, ipcMain, shell, getMainWindow, updateManager }) {
  const activeRuns = new Map();
  const historyFilePath = () => path.join(app.getPath("userData"), "history", "runs.json");

  ipcMain.handle("scenario:open", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "QA 시나리오 파일 선택",
      properties: ["openFile"],
      filters: [
        { name: "Scenario files", extensions: ["md", "txt", "json", "yml", "yaml", "csv", "xlsx", "xls"] },
        { name: "All files", extensions: ["*"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = await loadScenarioFileContent(filePath);
    return { filePath, content };
  });

  ipcMain.handle("scenario:save", async (_event, payload) => {
    const content = String(payload?.content || "").trimEnd();
    if (!content) throw new Error("저장할 시나리오가 없습니다.");

    const title = payload?.title || extractScenarioTitle(content) || "autoqa-scenario";
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: "QA 시나리오 저장",
      defaultPath: `${sanitizeFileName(title)}.md`,
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "All files", extensions: ["*"] },
      ],
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
      impacted,
    };
  });

  ipcMain.handle("qa:history", async () => {
    const history = await loadHistory(historyFilePath());
    return summarizeHistory(history);
  });
  ipcMain.handle("qa:browsers", async () => ({
    defaultBrowserId: getDefaultBrowserId(),
    items: getSupportedBrowserOptions().map((browser) => ({
      id: browser.id,
      label: browser.label,
    })),
  }));

  ipcMain.handle("app:update-check", async () => updateManager.checkForUpdates());
  ipcMain.handle("app:update-install", async () => updateManager.installUpdate());

  ipcMain.handle("scenario:extract-open", async (_event, payload) => ({
    targetUrl: normalizeRecorderUrl(payload?.baseUrl),
    preloadUrl: pathToFileURL(path.join(__dirname, "..", "recorder-preload.js")).toString(),
  }));

  ipcMain.on("scenario:extracted", (_event, payload) => {
    getMainWindow()?.webContents.send("scenario:extracted", payload);
  });

  ipcMain.on("scenario:recorder-state", (_event, payload) => {
    getMainWindow()?.webContents.send("scenario:recorder-state", payload);
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
          getMainWindow()?.webContents.send("qa:progress", { runId, ...progress });
        },
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

  ipcMain.handle("qa:export-failures", async (_event, payload) => {
    const format = payload?.format === "md" ? "md" : "excel";
    const summary = payload?.summary || {};
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const failedCount = results.filter((result) => result?.status === "failed").length;

    if (!failedCount) {
      throw new Error("내보낼 실패 시나리오가 없습니다.");
    }

    const isMarkdown = format === "md";
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: "실패 시나리오 내보내기",
      defaultPath: getFailureExportDefaultName(summary, isMarkdown ? "md" : "excel"),
      filters: isMarkdown
        ? [{ name: "Markdown", extensions: ["md"] }]
        : [{ name: "Excel CSV", extensions: ["csv"] }],
    });

    if (result.canceled || !result.filePath) return null;

    const expectedExtension = isMarkdown ? ".md" : ".csv";
    const filePath = path.extname(result.filePath)
      ? result.filePath
      : `${result.filePath}${expectedExtension}`;

    return writeFailureExport({
      summary,
      results,
      format: isMarkdown ? "md" : "excel",
      filePath,
    });
  });

  ipcMain.handle("qa:download-videos", async (_event, payload) => {
    const summary = payload?.summary || {};
    const videos = Array.isArray(payload?.videos) ? payload.videos : [];

    if (!videos.length) {
      throw new Error("저장할 실행 동영상이 없습니다.");
    }

    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "실행 동영상 저장 위치 선택",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const baseDir = result.filePaths[0];
    const targetDir = path.join(
      baseDir,
      `${sanitizeFileName(summary.runId || "autoqa-run")}-videos`,
    );
    await fs.mkdir(targetDir, { recursive: true });

    for (const [index, video] of videos.entries()) {
      if (!video?.filePath) continue;
      const ext = path.extname(video.filePath) || ".webm";
      const fileName = `${String(index + 1).padStart(2, "0")}-${sanitizeFileName(video.title || "scenario")}${ext}`;
      await fs.copyFile(video.filePath, path.join(targetDir, fileName));
    }

    return {
      directoryPath: targetDir,
      count: videos.length,
    };
  });

  ipcMain.handle("report:open", async (_event, filePath) => {
    if (!filePath) return false;
    await shell.openPath(filePath);
    return true;
  });
}

module.exports = {
  registerIpcHandlers,
};
