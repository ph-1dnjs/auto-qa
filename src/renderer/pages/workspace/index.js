import {
  flowGridUnit,
  flowGuides,
  flowShapeTemplates,
  maxUrlHistoryItems,
  urlHistoryStorageKey,
} from "../../shared/config/ui.js";
import { elements } from "../../shared/lib/dom/elements.js";
import {
  getFilteredHomePromptCommands,
  getFilteredHomePromptUrls,
  normalizeHomePromptUrl,
  resolveHomePromptCommand,
  shouldSuggestHomePromptCommands,
} from "../../shared/lib/home-prompt.mjs";

document.body.dataset.platform = navigator.userAgent.includes("Mac") ? "mac" : "default";

let latestReportPath = null;
let latestRunResult = null;
let latestRunVideos = [];
let activeRunId = null;
let runStartedAt = 0;
let progressTimer = null;
let latestProgress = null;
let extractorResizeObserver = null;
let extractorFrameObserver = null;
let extractorViewportSyncTimer = null;
let extractorResizeSettledTimer = null;
let extractorSidebarOpen = false;
let extractorToolDragState = null;
let currentPage = "home";
let qaScenarioCatalog = [];
let qaVisibleScenarioCatalog = [];
let qaSelectedScenarioIndex = 0;
let qaScenarioFilterKeyword = "";
let qaUiState = "configure";
let qaRunLogs = [];
let qaLastProgressTitle = "";
const flowBuilder = {
  gridSize: flowGridUnit,
  width: 1680,
  height: 960,
  tool: "process",
  connectSource: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  nodes: [],
  edges: [],
  nextNodeId: 1,
  nextEdgeId: 1,
  zoom: 1,
  selectedColor: "#0066cc",
};
let flowDragState = null;

function getDefaultFlowFontSize(type) {
  return type === "decision" ? 13 : 16;
}

function getFlowNodeMinWidth(type) {
  return type === "decision" ? flowGridUnit * 4 : flowGridUnit * 3;
}

function getFlowNodeMinHeight(type) {
  return type === "decision" ? flowGridUnit * 4 : flowGridUnit * 3;
}

window.autoqa.onProgress((progress) => {
  if (progress.runId !== activeRunId) return;
  latestProgress = progress;
  renderProgress(progress);
});

window.autoqa.onScenarioExtracted((payload) => {
  if (!payload?.markdown) return;
  const current = elements.scenarioText.value.trim();
  const nextValue = current
    ? `${current}\n\n${payload.markdown.trim()}\n`
    : `${payload.markdown.trim()}\n`;
  setSharedScenarioText(nextValue);
  setScenarioStatus("시나리오 추출 결과가 추가됨");
  renderExtractorScenarioPreview();
});

window.autoqa.onRecorderState((state) => {
  renderExtractorRecorderState(state);
});

window.autoqa.onAppUpdateState((state) => {
  renderAppUpdateState(state);
});

window.addEventListener("unhandledrejection", (event) => {
  const message = event.reason?.message || String(event.reason || "알 수 없는 오류");
  setScenarioStatus(message);
  elements.statusText.textContent = "실패";
});

elements.navScenarioPage.addEventListener("click", () => setPage("scenario"));
elements.navQaPage.addEventListener("click", () => setPage("qa"));
elements.qaSidebarHome?.addEventListener("click", () => setPage("home"));
elements.qaSidebarScenario?.addEventListener("click", () => setPage("scenario"));
elements.qaSidebarExecution?.addEventListener("click", () => setPage("qa"));
elements.navScenarioInline?.addEventListener("click", () => setPage("scenario"));
elements.homeBrand?.addEventListener("click", () => setPage("home"));
elements.scenarioGoHome?.addEventListener("click", () => setPage("home"));
elements.scenarioGoQa?.addEventListener("click", () => setPage("qa"));
elements.homeScenarioCta?.addEventListener("click", () => setPage("scenario"));
elements.homeQaCta?.addEventListener("click", () => setPage("qa"));
elements.homePromptForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  handleHomePromptSubmit(elements.homePromptInput?.value || "");
});
elements.homePromptSubmit?.addEventListener("click", () => {
  handleHomePromptSubmit(elements.homePromptInput?.value || "");
});
elements.homePromptInput?.addEventListener("input", () => {
  handleHomePromptInputChange(elements.homePromptInput.value);
});
elements.homePromptInput?.addEventListener("focus", () => {
  handleHomePromptInputChange(elements.homePromptInput.value);
});
elements.homePromptInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleHomePromptSubmit(elements.homePromptInput.value);
});
elements.homePromptShortcutButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.homePromptValue || "";
    if (elements.homePromptInput) {
      elements.homePromptInput.value = value;
    }
    handleHomePromptSubmit(value);
  });
});
elements.openScenario.addEventListener("click", openScenarioIntoEditors);
elements.openScenarioQa.addEventListener("click", openScenarioIntoEditors);
elements.saveScenario.addEventListener("click", saveCurrentScenario);
elements.saveExtractorScenario.addEventListener("click", saveCurrentScenario);
elements.scenarioReset?.addEventListener("click", () => {
  setSharedScenarioText("");
  renderExtractorScenarioPreview();
  setScenarioStatus("시나리오를 초기화했습니다.");
});

elements.toggleUrlHistory.addEventListener("click", () => {
  const isOpen = !elements.urlHistoryMenu.classList.contains("hidden");
  setUrlHistoryOpen(!isOpen, "qa");
});

elements.toggleScenarioUrlHistory.addEventListener("click", () => {
  const isOpen = !elements.scenarioUrlHistoryMenu.classList.contains("hidden");
  setUrlHistoryOpen(!isOpen, "scenario");
});

elements.clearUrlHistory.addEventListener("click", () => {
  window.localStorage.removeItem(urlHistoryStorageKey);
  renderUrlHistory();
});

elements.clearScenarioUrlHistory.addEventListener("click", () => {
  window.localStorage.removeItem(urlHistoryStorageKey);
  renderUrlHistory();
});

elements.qaBaseUrl.addEventListener("focus", () => {
  if (loadUrlHistory().length) setUrlHistoryOpen(true, "qa");
});

elements.scenarioBaseUrl.addEventListener("focus", () => {
  if (loadUrlHistory().length) setUrlHistoryOpen(true, "scenario");
});

elements.scenarioBaseUrl.addEventListener("input", () => {
  elements.qaBaseUrl.value = elements.scenarioBaseUrl.value;
});

elements.qaBaseUrl.addEventListener("input", () => {
  elements.scenarioBaseUrl.value = elements.qaBaseUrl.value;
  elements.qaPreviewLocation.textContent = `${elements.qaBaseUrl.value || "https://example.com"}/login`;
  syncQaExecutionSummary();
});

elements.headless.addEventListener("change", () => {
  syncPreviewVisibility();
  syncQaExecutionSummary();
});
elements.failFast.addEventListener("change", syncQaExecutionSummary);
elements.workers.addEventListener("input", () => {
  syncQaExecutionSummary();
  renderQaWorkerCards();
});
elements.browserSelect.addEventListener("change", syncQaExecutionSummary);
elements.qaRunAgain?.addEventListener("click", () => {
  elements.runQa.click();
});
elements.qaBackToConfigure?.addEventListener("click", () => {
  setQaVisualState("configure");
  elements.statusText.textContent = "대기 중";
  elements.qaSidebarStatusMeta.textContent = "실행 구성을 다시 조정할 수 있습니다.";
});
elements.qaDownloadVideos?.addEventListener("click", async () => {
  if (!latestRunResult || !latestRunVideos.length) return;
  elements.qaDownloadVideos.disabled = true;
  try {
    const saved = await window.autoqa.downloadRunVideos({
      summary: latestRunResult.summary,
      videos: latestRunVideos,
    });
    if (saved?.directoryPath) {
      elements.statusText.textContent = `동영상 저장 완료 (${saved.count}개)`;
    }
  } catch (error) {
    elements.statusText.textContent = error.message || "동영상 저장 실패";
  } finally {
    elements.qaDownloadVideos.disabled = false;
  }
});

elements.checkForUpdates.addEventListener("click", async () => {
  elements.checkForUpdates.disabled = true;
  try {
    await window.autoqa.checkForAppUpdate();
  } finally {
    elements.checkForUpdates.disabled = false;
  }
});

elements.installUpdate.addEventListener("click", async () => {
  elements.installUpdate.disabled = true;
  await window.autoqa.installAppUpdate();
});

elements.scenarioText.addEventListener("input", () => {
  syncScenarioEditors(elements.scenarioText, elements.qaScenarioText);
  renderExtractorScenarioPreview();
});

elements.qaScenarioText.addEventListener("input", () => {
  syncScenarioEditors(elements.qaScenarioText, elements.scenarioText);
  renderQaScenarioCatalog();
});
elements.qaScenarioFilter?.addEventListener("input", () => {
  qaScenarioFilterKeyword = String(elements.qaScenarioFilter.value || "").trim().toLowerCase();
  renderQaScenarioCatalog();
});
elements.commandPaletteInput?.addEventListener("input", () => {
  renderCommandPalette(elements.commandPaletteInput.value);
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".url-field")) return;
  if (!event.target.closest(".home-minimal-form")) {
    setHomeCommandMenuOpen(false);
  }
  setUrlHistoryOpen(false, "all");
});

document.addEventListener("keydown", (event) => {
  const isPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
  if (isPaletteShortcut) {
    event.preventDefault();
    setCommandPaletteOpen(!elements.commandPalette || elements.commandPalette.classList.contains("hidden"));
    return;
  }
  if (event.key === "Escape" && elements.commandPalette && !elements.commandPalette.classList.contains("hidden")) {
    setCommandPaletteOpen(false);
  }
});

elements.commandPalette?.addEventListener("click", (event) => {
  if (event.target === elements.commandPalette) {
    setCommandPaletteOpen(false);
  }
});
elements.commandPalette?.addEventListener("focusout", () => {
  window.requestAnimationFrame(() => {
    if (!elements.commandPalette?.contains(document.activeElement)) {
      setCommandPaletteOpen(false);
    }
  });
});

window.addEventListener("resize", updateDesktopTier);

elements.extractorTogglePin.addEventListener("click", () => {
  sendExtractorRecorderCommand("toggleCapture");
});
elements.extractorAddPath.addEventListener("click", () => {
  sendExtractorRecorderCommand("addCurrentPath");
});
elements.extractorUndoStep.addEventListener("click", () => {
  sendExtractorRecorderCommand("undoStep");
});
elements.extractorClearSteps.addEventListener("click", () => {
  sendExtractorRecorderCommand("clearSteps");
});
elements.extractorCommitScenario.addEventListener("click", () => {
  sendExtractorRecorderCommand("commitScenario", {
    title: elements.extractorRecorderTitle.value,
    feature: elements.extractorRecorderFeature.value,
    suite: elements.extractorRecorderSuite.value,
    tags: elements.extractorRecorderTags.value,
  });
});
elements.toggleExtractorSidebar.addEventListener("click", () => {
  toggleExtractorSidebar();
});
elements.closeExtractorSidebar.addEventListener("click", () => {
  setExtractorSidebarOpen(false);
});

elements.extractScenario.addEventListener("click", async () => {
  const previousPage = currentPage;
  const baseUrl = normalizeUrlInput(elements.scenarioBaseUrl.value);
  if (!baseUrl) {
    setScenarioStatus("시나리오 추출 대상 URL을 입력하세요.");
    elements.scenarioBaseUrl.focus();
    return;
  }
  try {
    setScenarioStatus("시나리오 추출 화면을 여는 중...");
    const config = await window.autoqa.openScenarioExtractor({
      baseUrl,
    });
    openExtractorRoutePending();
    openEmbeddedExtractor(config);
    setScenarioStatus("시나리오 추출 화면이 열렸습니다.");
  } catch (error) {
    if (currentPage === "extractor") {
      setPage(previousPage === "extractor" ? "scenario" : previousPage);
    }
    setScenarioStatus(error.message || "시나리오 추출 화면을 열지 못했습니다.");
  }
});

elements.closeExtractor.addEventListener("click", () => setPage("scenario"));
elements.extractorShell.addEventListener("click", (event) => {
  if (!extractorSidebarOpen) return;
  if (event.target.closest(".extractor-sidebar")) return;
  if (event.target.closest("#toggleExtractorSidebar")) return;
  setExtractorSidebarOpen(false);
});

elements.runQa.addEventListener("click", async () => {
  activeRunId = `run-${Date.now()}`;
  runStartedAt = Date.now();
  const scenarioTotal = countScenarioRunsFallback(
    elements.qaScenarioText.value,
  );
  const previewEnabled = elements.headless.checked;
  qaLastProgressTitle = "";
  clearQaLogs();
  appendQaLog("실행을 준비하는 중입니다.", "info");
  setQaVisualState("running");
  setRunning(true);
  renderResults([]);
  renderRunCounts({ total: scenarioTotal, passed: 0, failed: 0 });
  resetScreenPreview(scenarioTotal, previewEnabled);
  resetProgress(scenarioTotal);
  startProgressTicker();
  latestReportPath = null;
  latestRunResult = null;
  latestRunVideos = [];
  elements.openReport.classList.add("hidden");
  elements.qaDownloadVideos.classList.add("hidden");
  elements.exportFailures.classList.add("hidden");
  elements.failureExportField.classList.add("hidden");

  try {
    saveBaseUrlHistory(elements.qaBaseUrl.value);
    const result = await window.autoqa.run({
      runId: activeRunId,
      baseUrl: elements.qaBaseUrl.value,
      scenarioText: elements.qaScenarioText.value,
      browserId: elements.browserSelect.value,
      workers: Number(elements.workers.value) || 1,
      headless: elements.headless.checked,
      failFast: elements.failFast.checked,
    });

    elements.statusText.textContent = "완료";
    elements.qaSidebarStatusMeta.textContent = "실행이 정상적으로 완료되었습니다.";
    renderRunCounts({
      total: result.summary.scenarioTotal ?? result.summary.total,
      passed: result.summary.scenarioPassed ?? result.summary.passed,
      failed: result.summary.scenarioFailed ?? result.summary.failed,
    });
    renderResults(result.results);
    syncQaCompletionSummary(result);
    latestRunResult = result;
    latestRunVideos = Array.isArray(result.reports?.videos) ? result.reports.videos : [];
    latestReportPath = result.reports.htmlPath;
    elements.openReport.classList.remove("hidden");
    syncRunVideoControls(result);
    syncFailureExportControls(result);
    refreshHistory();
    appendQaLog("실행이 완료되었습니다.", "success");
    setQaVisualState("complete");
  } catch (error) {
    const errorMessage = normalizeRunError(error.message);
    const cancelled = error.message.includes("취소");
    elements.statusText.textContent = cancelled ? "취소됨" : "실패";
    elements.qaSidebarStatusMeta.textContent = cancelled
      ? "사용자 요청으로 실행이 중단되었습니다."
      : "실행 중 오류가 발생했습니다.";
    renderResults([
      {
        title: cancelled
          ? "QA 실행이 취소되었습니다"
          : "실행을 완료하지 못했습니다",
        status: cancelled ? "skipped" : "failed",
        error: errorMessage,
        durationMs: 0,
      },
    ]);
    syncQaCompletionSummary(null, { cancelled, error: { ...error, message: errorMessage } });
    latestRunResult = null;
    latestRunVideos = [];
    syncRunVideoControls(null);
    syncFailureExportControls(null);
    appendQaLog(cancelled ? "실행이 취소되었습니다." : `실행 실패: ${errorMessage}`, "error");
    setQaVisualState("complete");
  } finally {
    stopProgressTicker();
    setRunning(false);
    activeRunId = null;
    runStartedAt = 0;
  }
});

async function hydrateBrowserOptions() {
  try {
    const browserPayload = await window.autoqa.listBrowsers();
    const items = Array.isArray(browserPayload?.items) ? browserPayload.items : [];
    if (!items.length) return;

    const selected = elements.browserSelect.value || browserPayload.defaultBrowserId || "chromium";
    elements.browserSelect.innerHTML = "";
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      elements.browserSelect.append(option);
    }
    elements.browserSelect.value = items.some((item) => item.id === selected)
      ? selected
      : (browserPayload.defaultBrowserId || items[0].id);
    syncQaExecutionSummary();
  } catch {
    elements.browserSelect.value = "chromium";
    syncQaExecutionSummary();
  }
}

elements.cancelQa.addEventListener("click", async () => {
  if (!activeRunId) return;
  elements.cancelQa.disabled = true;
  elements.progressPhase.textContent = "취소 중";
  await window.autoqa.cancel(activeRunId);
});

elements.openReport.addEventListener("click", async () => {
  if (latestReportPath) await window.autoqa.openReport(latestReportPath);
});

elements.exportFailures.addEventListener("click", async () => {
  if (!latestRunResult) return;
  elements.exportFailures.disabled = true;
  try {
    const exported = await window.autoqa.exportFailures({
      format: elements.failureExportFormat.value,
      summary: latestRunResult.summary,
      results: latestRunResult.results,
    });
    if (exported?.filePath) {
      elements.statusText.textContent = `실패 파일 저장 완료 (${exported.count}건)`;
    }
  } catch (error) {
    elements.statusText.textContent = error.message || "실패 파일 저장 실패";
  } finally {
    elements.exportFailures.disabled = false;
  }
});

initializeWorkspace();

function initializeWorkspace() {
  setPage("home");

  const startupTasks = [
    () => renderUrlHistory(),
    () => syncPreviewVisibility(),
    () => refreshHistory(),
    () => initializeExtractorFloatingTool(),
    () => updateDesktopTier(),
    () => hydrateBrowserOptions(),
    () => renderQaScenarioCatalog(),
    () => setQaVisualState("configure"),
    () => syncQaExecutionSummary(),
    () => renderQaWorkerCards(),
  ];

  startupTasks.forEach((task) => {
    try {
      task();
    } catch (error) {
      reportStartupError(error);
    }
  });
}

function reportStartupError(error) {
  const message = error?.message || "초기화 중 오류가 발생했습니다.";
  console.error(error);
  setHomePromptHint(`초기화 오류: ${message}`, true);
  setScenarioStatus(message);
}

function setPage(page) {
  if (page === "flow") page = "scenario";
  if (currentPage === "extractor" && page !== "extractor") {
    teardownExtractorRoute();
  }
  currentPage = page;
  document.body.dataset.page = page;
  const pages = {
    home: elements.homePage,
    scenario: elements.scenarioPage,
    qa: elements.qaPage,
    extractor: elements.extractorPage,
  };

  Object.entries(pages).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== page);
  });

  elements.navScenarioPage.classList.toggle("active", page === "scenario");
  elements.navQaPage.classList.toggle("active", page === "qa");
  elements.qaSidebarHome?.classList.toggle("active", page === "home");
  elements.qaSidebarScenario?.classList.toggle("active", page === "scenario");
  elements.qaSidebarExecution?.classList.toggle("active", page === "qa");
  renderCommandPalette(elements.commandPaletteInput?.value || "");
}

function handleHomePromptSubmit(rawValue) {
  const value = String(rawValue || "").trim();
  setHomeCommandMenuOpen(false);
  if (!value) {
    setHomePromptHint("명령어나 URL을 입력하세요.", true);
    elements.homePromptInput?.focus();
    return;
  }

  const handled = runHomePromptCommand(value);
  if (handled) {
    return;
  }

  const normalizedUrl = normalizeHomePromptUrl(value);
  if (normalizedUrl) {
    saveBaseUrlHistory(normalizedUrl);
    elements.scenarioBaseUrl.value = normalizedUrl;
    elements.qaBaseUrl.value = normalizedUrl;
    setScenarioStatus(`대상 URL이 설정되었습니다: ${normalizedUrl}`);
    setPage("scenario");
    setHomePromptHint("URL을 시나리오 작성 화면으로 전달했습니다.", false);
    window.requestAnimationFrame(() => {
      elements.scenarioBaseUrl.focus();
    });
    return;
  }

  if (value.startsWith("/") || shouldSuggestHomePromptCommands(getHomePromptCommands(), value)) {
    renderHomeCommandMenu(value);
    setHomePromptHint("알 수 없는 명령입니다. `/시나리오`, `/실행`을 사용하세요.", true);
    return;
  }

  setHomePromptHint("지원하지 않는 입력입니다. 명령어나 URL을 확인하세요.", true);
}

function runHomePromptCommand(rawCommand) {
  const matched = resolveHomePromptCommand(getHomePromptCommands(), rawCommand);
  if (!matched) {
    return false;
  }
  matched.run();
  setHomeCommandMenuOpen(false);
  setHomePromptHint(`명령을 실행했습니다: ${rawCommand}`, false);
  return true;
}

function handleHomePromptInputChange(rawValue) {
  const commands = getHomePromptCommands();
  const matchedUrls = getFilteredHomePromptUrls(loadUrlHistory(), rawValue);
  if (!shouldSuggestHomePromptCommands(commands, rawValue) && !matchedUrls.length) {
    setHomeCommandMenuOpen(false);
    return;
  }
  renderHomeCommandMenu(rawValue, matchedUrls);
}

function getHomePromptCommands() {
  return [
    {
      id: "home-command-scenario",
      command: "/시나리오",
      aliases: ["/scenario", "/추출", "/extract", "시나리오", "scenario", "추출", "extract"],
      title: "시나리오 워크스페이스",
      description: "시나리오 작성과 URL 추출 화면으로 이동합니다.",
      keywords: ["시나리오", "추출", "편집", "scenario", "extract"],
      run: () => setPage("scenario"),
    },
    {
      id: "home-command-run",
      command: "/실행",
      aliases: ["/qa", "/run", "실행", "qa", "run"],
      title: "실행 콘솔",
      description: "현재 시나리오 기준으로 QA 실행 화면으로 이동합니다.",
      keywords: ["실행", "qa", "run", "console"],
      run: () => setPage("qa"),
    },
    {
      id: "home-command-home",
      command: "/홈",
      aliases: ["/home", "홈", "home"],
      title: "메인 화면",
      description: "현재 메인 화면 상태로 다시 돌아옵니다.",
      keywords: ["홈", "메인", "home"],
      run: () => setPage("home"),
    },
    {
      id: "home-command-palette",
      command: "/명령",
      aliases: ["/command", "명령", "command"],
      title: "전체 명령 팔레트",
      description: "추가 명령 검색 패널을 엽니다.",
      keywords: ["명령", "팔레트", "command", "palette"],
      run: () => setCommandPaletteOpen(true),
    },
  ];
}

function renderHomeCommandMenu(rawValue, matchedUrls = getFilteredHomePromptUrls(loadUrlHistory(), rawValue)) {
  if (!elements.homeCommandMenu || !elements.homeCommandList) return;
  const commands = getFilteredHomePromptCommands(getHomePromptCommands(), rawValue);
  const shouldShowCommands = shouldSuggestHomePromptCommands(getHomePromptCommands(), rawValue);

  if (!shouldShowCommands && !matchedUrls.length) {
    elements.homeCommandList.innerHTML = `
      <div class="home-command-empty">
        <strong>일치하는 항목이 없습니다.</strong>
        <span>다른 키워드나 URL 일부를 다시 입력해보세요.</span>
      </div>
    `;
    setHomeCommandMenuOpen(true);
    return;
  }

  const sections = [];

  if (shouldShowCommands && commands.length) {
    sections.push(`
      <div class="home-command-section">
        <p class="home-command-section-label">명령</p>
        ${commands
    .map((command) => `
          <button class="home-command-item" type="button" data-home-command-id="${command.id}">
            <div class="home-command-item-main">
              <strong>${escapeHtml(command.command)}</strong>
              <span>${escapeHtml(command.title)}</span>
            </div>
            <p>${escapeHtml(command.description)}</p>
          </button>
        `)
    .join("")}
      </div>
    `);
  }

  if (matchedUrls.length) {
    sections.push(`
      <div class="home-command-section">
        <p class="home-command-section-label">최근 URL</p>
        ${matchedUrls
    .map((item, index) => `
          <button class="home-command-item home-command-item-url" type="button" data-home-history-index="${index}">
            <div class="home-command-item-main">
              <strong>${escapeHtml(item.url)}</strong>
              <span>최근 입력한 URL</span>
            </div>
            <p>${escapeHtml(formatHistoryDate(item.savedAt))}에 저장됨</p>
          </button>
        `)
    .join("")}
      </div>
    `);
  }

  elements.homeCommandList.innerHTML = sections.join("");

  elements.homeCommandList.querySelectorAll("[data-home-command-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = commands.find((command) => command.id === button.dataset.homeCommandId);
      if (!selected) return;
      if (elements.homePromptInput) {
        elements.homePromptInput.value = selected.command;
      }
      selected.run();
      setHomeCommandMenuOpen(false);
      setHomePromptHint(`명령을 실행했습니다: ${selected.command}`, false);
    });
  });

  elements.homeCommandList.querySelectorAll("[data-home-history-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = matchedUrls[Number(button.dataset.homeHistoryIndex)];
      if (!selected?.url) return;
      if (elements.homePromptInput) {
        elements.homePromptInput.value = selected.url;
      }
      elements.scenarioBaseUrl.value = selected.url;
      elements.qaBaseUrl.value = selected.url;
      setHomeCommandMenuOpen(false);
      setScenarioStatus(`대상 URL이 설정되었습니다: ${selected.url}`);
      setHomePromptHint("이전 URL 기록을 불러왔습니다.", false);
      setPage("scenario");
      window.requestAnimationFrame(() => {
        elements.scenarioBaseUrl.focus();
      });
    });
  });

  setHomeCommandMenuOpen(true);
}

function setHomeCommandMenuOpen(isOpen) {
  if (!elements.homeCommandMenu) return;
  elements.homeCommandMenu.classList.toggle("hidden", !isOpen);
}

function setHomePromptHint(message, isError) {
  if (!elements.homePromptHint) return;
  elements.homePromptHint.classList.remove("hidden");
  elements.homePromptHint.textContent = message;
  elements.homePromptHint.dataset.state = isError ? "error" : "idle";
}

function updateDesktopTier() {
  const width = window.innerWidth;
  let tier = "compact";
  if (width >= 2560) {
    tier = "ultrawide";
  } else if (width >= 1920) {
    tier = "expanded";
  } else if (width >= 1600) {
    tier = "standard-plus";
  } else if (width >= 1440) {
    tier = "standard";
  }
  document.body.dataset.desktopTier = tier;
}

function setFlowTool(tool) {
  flowBuilder.tool = flowGuides[tool] ? tool : "process";
  elements.flowShapeType.value = flowBuilder.tool;
  elements.flowShapeCards.forEach((button) => {
    button.classList.toggle("active", button.dataset.flowShapeCard === flowBuilder.tool);
  });
  renderFlowGuide();
}

function renderFlowGuide() {
  const guide = flowGuides[flowBuilder.tool] || flowGuides.process;
  elements.flowGuideTitle.textContent = guide.title;
  elements.flowGuideDescription.textContent = guide.description;
}

function isFlowConnecting() {
  return Boolean(flowBuilder.connectSource);
}

function resetFlowBuilder() {
  flowBuilder.nodes = [];
  flowBuilder.edges = [];
  flowBuilder.selectedNodeId = null;
  flowBuilder.selectedEdgeId = null;
  flowBuilder.connectSource = null;
  flowBuilder.nextNodeId = 1;
  flowBuilder.nextEdgeId = 1;
  renderFlowBuilder();
}

function createFlowNode(type, x, y, label = "") {
  const template = flowShapeTemplates[type] || flowShapeTemplates.process;
  return {
    id: `flow-node-${flowBuilder.nextNodeId++}`,
    type,
    x: snapFlow(x),
    y: snapFlow(y),
    width: template.width,
    height: template.height,
    label: label || template.label,
    fill: template.defaultColor,
    fontSize: getDefaultFlowFontSize(type),
  };
}

function createFlowEdge(from, fromPort, to, toPort, label = "") {
  return {
    id: `flow-edge-${flowBuilder.nextEdgeId++}`,
    from,
    fromPort,
    to,
    toPort,
    label,
  };
}

function addFlowNodeAtViewportCenter() {
  const viewport = elements.flowCanvasViewport.getBoundingClientRect();
  const centerX = elements.flowCanvasViewport.scrollLeft + viewport.width / 2;
  const centerY = elements.flowCanvasViewport.scrollTop + viewport.height / 2;
  const template = flowShapeTemplates[flowBuilder.tool] || flowShapeTemplates.process;
  const node = createFlowNode(
    flowBuilder.tool,
    snapFlow(centerX - template.width / 2),
    snapFlow(centerY - template.height / 2),
  );
  flowBuilder.nodes.push(node);
  flowBuilder.selectedNodeId = node.id;
  updateFlowStatus();
  renderFlowBuilder();
}

function snapFlow(value) {
  return Math.round(value / flowBuilder.gridSize) * flowBuilder.gridSize;
}

function alignFlowNodeToNearbyAxes(node, nextX, nextY) {
  const threshold = flowBuilder.gridSize / 2;
  const proposedCenterX = nextX + node.width / 2;
  const proposedCenterY = nextY + node.height / 2;
  let alignedX = nextX;
  let alignedY = nextY;
  let bestDeltaX = threshold + 1;
  let bestDeltaY = threshold + 1;

  for (const otherNode of flowBuilder.nodes) {
    if (otherNode.id === node.id) continue;
    const otherCenterX = otherNode.x + otherNode.width / 2;
    const otherCenterY = otherNode.y + otherNode.height / 2;
    const deltaX = Math.abs(proposedCenterX - otherCenterX);
    const deltaY = Math.abs(proposedCenterY - otherCenterY);

    if (deltaX <= threshold && deltaX < bestDeltaX) {
      alignedX = snapFlow(otherCenterX - node.width / 2);
      bestDeltaX = deltaX;
    }
    if (deltaY <= threshold && deltaY < bestDeltaY) {
      alignedY = snapFlow(otherCenterY - node.height / 2);
      bestDeltaY = deltaY;
    }
  }

  return { x: alignedX, y: alignedY };
}

function renderFlowBuilder() {
  elements.flowCanvas.style.width = `${flowBuilder.width}px`;
  elements.flowCanvas.style.height = `${flowBuilder.height}px`;
  elements.flowCanvas.style.zoom = String(flowBuilder.zoom);
  elements.flowZoomLabel.textContent = `${Math.round(flowBuilder.zoom * 100)}%`;
  renderFlowEdges();
  renderFlowNodes();
  updateFlowStatus();
  syncFlowPropertyPanel();
}

function renderFlowNodes() {
  elements.flowNodeLayer.innerHTML = flowBuilder.nodes
    .map((node) => {
      const isSelected = node.id === flowBuilder.selectedNodeId;
      const selectedClass = isSelected ? " selected" : "";
      const connectClass = flowBuilder.connectSource?.nodeId === node.id ? " connect-source" : "";
      const connectTargetsClass = isFlowConnecting() ? " connect-targets" : "";
      const resizeHandle = node.id === flowBuilder.selectedNodeId
        ? `<button class="flow-node-resize-handle" type="button" data-node-id="${node.id}" data-resize-handle="true" aria-label="도형 크기 조정"></button>`
        : "";
      const nodeLabel = escapeHtml(node.label);
      const ports = renderFlowPorts(node);
      if (node.type === "decision") {
        return `
          <div class="flow-node flow-node-${node.type}${selectedClass}${connectClass}${connectTargetsClass}" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--node-fill:${escapeHtml(node.fill)};--node-fill-rgb:${hexToRgb(node.fill)};--node-font-size:${node.fontSize || getDefaultFlowFontSize(node.type)}px;">
            <button class="flow-node-body" type="button" data-node-id="${node.id}">
              <span class="flow-node-diamond-shape" aria-hidden="true"></span>
              <span class="flow-node-diamond-label">${nodeLabel}</span>
            </button>
            ${ports}
            ${resizeHandle}
          </div>
        `;
      }
      return `
        <div class="flow-node flow-node-${node.type}${selectedClass}${connectClass}${connectTargetsClass}" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--node-fill:${escapeHtml(node.fill)};--node-fill-rgb:${hexToRgb(node.fill)};--node-font-size:${node.fontSize || getDefaultFlowFontSize(node.type)}px;">
          <button class="flow-node-body" type="button" data-node-id="${node.id}">
            <span>${nodeLabel}</span>
          </button>
          ${ports}
          ${resizeHandle}
        </div>
      `;
    })
    .join("");
}

function renderFlowPorts(node) {
  return ["top", "right", "bottom", "left"]
    .map((port) => `
      <button
        class="flow-port flow-port-${port}"
        type="button"
        data-node-id="${node.id}"
        data-port="${port}"
        aria-label="${port} 포트"
      ></button>
    `)
    .join("");
}

function renderFlowEdges() {
  const edgeMarkup = [];
  for (const edge of flowBuilder.edges) {
    const fromNode = getFlowNode(edge.from);
    const toNode = getFlowNode(edge.to);
    if (!fromNode || !toNode) continue;
    const pathData = buildFlowPath(fromNode, edge.fromPort, toNode, edge.toPort);
    const label = String(edge.label || "").trim();
    const labelMarkup = label
      ? `
        <g class="flow-edge-label-group" data-edge-id="${edge.id}" data-edge-label="true">
          <rect x="${pathData.labelX - 32}" y="${pathData.labelY - 12}" width="64" height="24" rx="12" class="flow-edge-label-bg"></rect>
          <text x="${pathData.labelX}" y="${pathData.labelY}" class="flow-edge-label">${escapeHtml(label)}</text>
        </g>
      `
      : "";
    const selectedClass = edge.id === flowBuilder.selectedEdgeId ? " selected" : "";
    edgeMarkup.push(`
      <g class="flow-edge-group${selectedClass}" data-edge-id="${edge.id}">
        <path d="${pathData.path}" class="flow-edge-path-underlay"></path>
        <path d="${pathData.path}" class="flow-edge-path" marker-end="url(#flowArrow)"></path>
        ${labelMarkup}
      </g>
    `);
  }

  elements.flowEdgeLayer.setAttribute("viewBox", `0 0 ${flowBuilder.width} ${flowBuilder.height}`);
  elements.flowEdgeLayer.innerHTML = `
    <defs>
      <marker id="flowArrow" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M2 2 L11 7 L2 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
      </marker>
    </defs>
    ${edgeMarkup.join("")}
  `;
}

function buildFlowPath(fromNode, fromPort, toNode, toPort) {
  const fromPoint = getFlowPortPoint(fromNode, fromPort);
  const toPoint = getFlowPortPoint(toNode, toPort);
  const midX = snapFlow((fromPoint.x + toPoint.x) / 2);
  return {
    path: `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`,
    labelX: midX,
    labelY: snapFlow((fromPoint.y + toPoint.y) / 2) - 8,
  };
}

function getFlowPortPoint(node, port) {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  if (port === "top") return { x: centerX, y: node.y };
  if (port === "right") return { x: node.x + node.width, y: centerY };
  if (port === "bottom") return { x: centerX, y: node.y + node.height };
  return { x: node.x, y: centerY };
}

function getFlowNode(id) {
  return flowBuilder.nodes.find((node) => node.id === id) || null;
}

function updateFlowStatus() {
  const selectedNode = getFlowNode(flowBuilder.selectedNodeId);
  const selectedEdge = getFlowEdge(flowBuilder.selectedEdgeId);
  elements.flowSelectionStatus.textContent = selectedNode
    ? `${getFlowShapeLabel(selectedNode.type)} 선택됨`
    : selectedEdge
      ? "연결선 선택됨"
      : "도형을 선택하고 추가하세요.";
  elements.flowConnectStatus.textContent = flowBuilder.connectSource
    ? `${getFlowShapeLabel(getFlowNode(flowBuilder.connectSource.nodeId)?.type)}의 ${translatePort(flowBuilder.connectSource.port)} 포트에서 연결 중`
    : selectedEdge
      ? "속성 패널에서 선 텍스트를 수정하거나 삭제할 수 있습니다."
      : selectedNode
      ? "도형 포트를 클릭하면 연결을 시작합니다."
      : "도형을 선택하면 연결 지점이 표시됩니다.";
}

function syncFlowPropertyPanel() {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  const edge = getFlowEdge(flowBuilder.selectedEdgeId);
  const hasSelection = Boolean(node || edge);
  const isNodeSelected = Boolean(node);
  const isEdgeSelected = Boolean(edge);
  elements.flowPropertiesPanel.classList.toggle("open", hasSelection);
  elements.flowNodeProperties.classList.toggle("hidden", !isNodeSelected);
  elements.flowEdgeProperties.classList.toggle("hidden", !isEdgeSelected);
  elements.flowNodeLabelInput.disabled = !isNodeSelected;
  elements.flowNodeTypeSelect.disabled = !isNodeSelected;
  elements.flowNodeFontSizeInput.disabled = !isNodeSelected;
  elements.flowNodeWidthInput.disabled = !isNodeSelected;
  elements.flowNodeHeightInput.disabled = !isNodeSelected;
  elements.flowCustomColor.disabled = !isNodeSelected;
  elements.applyFlowColor.disabled = !isNodeSelected;
  elements.flowEdgeLabelInput.disabled = !isEdgeSelected;
  elements.deleteFlowSelection.disabled = !hasSelection;
  elements.flowColorSwatches.forEach((button) => {
    button.disabled = !isNodeSelected;
  });
  if (!hasSelection) {
    elements.flowNodeLabelInput.value = "";
    elements.flowEdgeLabelInput.value = "";
    elements.flowNodeTypeSelect.value = flowBuilder.tool;
    elements.flowNodeFontSizeInput.value = String(getDefaultFlowFontSize(flowBuilder.tool));
    elements.flowNodeWidthInput.value = String(flowShapeTemplates[flowBuilder.tool]?.width || flowGridUnit * 10);
    elements.flowNodeHeightInput.value = String(flowShapeTemplates[flowBuilder.tool]?.height || flowGridUnit * 5);
    return;
  }
  if (isEdgeSelected) {
    elements.flowEdgeLabelInput.value = edge.label || "";
    return;
  }
  elements.flowNodeLabelInput.value = node.label;
  elements.flowNodeTypeSelect.value = node.type;
  elements.flowNodeFontSizeInput.value = String(node.fontSize || getDefaultFlowFontSize(node.type));
  elements.flowNodeWidthInput.value = String(node.width);
  elements.flowNodeHeightInput.value = String(node.height);
  syncFlowColorControls(node.fill);
}

function handleFlowCanvasPointerDown(event) {
  if (event.target !== elements.flowCanvas && event.target !== elements.flowNodeLayer) return;
  flowBuilder.selectedNodeId = null;
  flowBuilder.selectedEdgeId = null;
  flowBuilder.connectSource = null;
  renderFlowBuilder();
}

function handleFlowNodePointerDown(event) {
  const resizeHandle = event.target.closest("[data-resize-handle='true']");
  if (resizeHandle) {
    event.preventDefault();
    const node = getFlowNode(resizeHandle.dataset.nodeId);
    if (!node) return;
    flowBuilder.selectedNodeId = node.id;
    flowBuilder.selectedEdgeId = null;
    syncFlowColorControls(node.fill);
    flowDragState = {
      kind: "resize",
      nodeId: node.id,
      pointerId: event.pointerId,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originWidth: node.width,
      originHeight: node.height,
    };
    resizeHandle.setPointerCapture?.(event.pointerId);
    renderFlowBuilder();
    return;
  }

  const portButton = event.target.closest("[data-port]");
  if (portButton) {
    event.preventDefault();
    handleFlowPortSelection(portButton.dataset.nodeId, portButton.dataset.port);
    renderFlowBuilder();
    return;
  }

  const nodeButton = event.target.closest("[data-node-id]");
  if (!nodeButton) return;
  const node = getFlowNode(nodeButton.dataset.nodeId);
  if (!node) return;
  flowBuilder.selectedNodeId = node.id;
  flowBuilder.selectedEdgeId = null;
  syncFlowColorControls(node.fill);

  flowDragState = {
    kind: "move",
    nodeId: node.id,
    pointerId: event.pointerId,
    offsetX: getFlowCanvasPointerPosition(event).x - node.x,
    offsetY: getFlowCanvasPointerPosition(event).y - node.y,
  };
  nodeButton.setPointerCapture?.(event.pointerId);
  renderFlowBuilder();
}

function handleFlowPointerMove(event) {
  if (!flowDragState) return;
  const node = getFlowNode(flowDragState.nodeId);
  if (!node) return;
  if (flowDragState.kind === "resize") {
    const deltaX = (event.clientX - flowDragState.originClientX) / flowBuilder.zoom;
    const deltaY = (event.clientY - flowDragState.originClientY) / flowBuilder.zoom;
    const nextWidth = snapFlow(flowDragState.originWidth + deltaX);
    const nextHeight = snapFlow(flowDragState.originHeight + deltaY);
    applyFlowNodeSize(node, nextWidth, nextHeight);
  } else {
    const pointer = getFlowCanvasPointerPosition(event);
    const nextX = snapFlow(pointer.x - flowDragState.offsetX);
    const nextY = snapFlow(pointer.y - flowDragState.offsetY);
    const alignedPosition = alignFlowNodeToNearbyAxes(node, nextX, nextY);
    node.x = clampFlow(alignedPosition.x, 24, flowBuilder.width - node.width - 24);
    node.y = clampFlow(alignedPosition.y, 24, flowBuilder.height - node.height - 24);
  }
  renderFlowEdges();
  renderFlowNodes();
  syncFlowPropertyPanel();
}

function stopFlowDrag() {
  if (!flowDragState) return;
  flowDragState = null;
  renderFlowBuilder();
}

function clampFlow(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFlowCanvasPointerPosition(event) {
  const rect = elements.flowCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / flowBuilder.zoom + elements.flowCanvasViewport.scrollLeft / flowBuilder.zoom,
    y: (event.clientY - rect.top) / flowBuilder.zoom + elements.flowCanvasViewport.scrollTop / flowBuilder.zoom,
  };
}

function applyFlowNodeSize(node, width, height) {
  const minWidth = getFlowNodeMinWidth(node.type);
  const minHeight = getFlowNodeMinHeight(node.type);
  const nextWidth = clampFlow(
    snapFlow(Number(width) || node.width),
    minWidth,
    flowBuilder.width - node.x - 24,
  );
  const nextHeight = clampFlow(
    snapFlow(Number(height) || node.height),
    minHeight,
    flowBuilder.height - node.y - 24,
  );
  node.width = nextWidth;
  node.height = nextHeight;
}

function handleFlowPortSelection(nodeId, port) {
  flowBuilder.selectedNodeId = nodeId;
  flowBuilder.selectedEdgeId = null;
  if (!flowBuilder.connectSource) {
    flowBuilder.connectSource = { nodeId, port };
    updateFlowStatus();
    return;
  }
  if (flowBuilder.connectSource.nodeId === nodeId && flowBuilder.connectSource.port === port) {
    flowBuilder.connectSource = null;
    updateFlowStatus();
    return;
  }
  const exists = flowBuilder.edges.some((edge) =>
    edge.from === flowBuilder.connectSource.nodeId
    && edge.fromPort === flowBuilder.connectSource.port
    && edge.to === nodeId
    && edge.toPort === port);
  if (!exists) {
    const fromNode = getFlowNode(flowBuilder.connectSource.nodeId);
    const defaultLabel = fromNode?.type === "decision"
      ? getNextDecisionEdgeLabel(fromNode.id)
      : "";
    flowBuilder.edges.push(createFlowEdge(flowBuilder.connectSource.nodeId, flowBuilder.connectSource.port, nodeId, port, defaultLabel));
  }
  flowBuilder.connectSource = null;
  updateFlowStatus();
}

function handleFlowNodeDoubleClick(event) {
  const nodeButton = event.target.closest("[data-node-id]");
  if (!nodeButton) return;
  const node = getFlowNode(nodeButton.dataset.nodeId);
  if (!node) return;
  const nextLabel = window.prompt("도형 텍스트를 입력하세요.", node.label);
  if (nextLabel == null) return;
  node.label = nextLabel.trim() || node.label;
  flowBuilder.selectedNodeId = node.id;
  flowBuilder.selectedEdgeId = null;
  renderFlowBuilder();
}

function handleFlowEdgeClick(event) {
  const edgeGroup = event.target.closest("[data-edge-id]");
  if (!edgeGroup) return;
  flowBuilder.selectedEdgeId = edgeGroup.dataset.edgeId;
  flowBuilder.selectedNodeId = null;
  flowBuilder.connectSource = null;
  renderFlowBuilder();
}

function deleteSelectedFlowSelection() {
  if (flowBuilder.selectedEdgeId) {
    flowBuilder.edges = flowBuilder.edges.filter((edge) => edge.id !== flowBuilder.selectedEdgeId);
    flowBuilder.selectedEdgeId = null;
    renderFlowBuilder();
    return;
  }
  if (!flowBuilder.selectedNodeId) return;
  const nodeId = flowBuilder.selectedNodeId;
  flowBuilder.nodes = flowBuilder.nodes.filter((node) => node.id !== nodeId);
  flowBuilder.edges = flowBuilder.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
  if (flowBuilder.connectSource?.nodeId === nodeId) {
    flowBuilder.connectSource = null;
  }
  flowBuilder.selectedNodeId = null;
  renderFlowBuilder();
}

function setFlowZoom(value) {
  flowBuilder.zoom = Math.max(0.5, Math.min(2, Math.round(value * 100) / 100));
  renderFlowBuilder();
}

function selectFlowColor(color, syncCustom = true) {
  flowBuilder.selectedColor = color;
  elements.flowColorSwatches.forEach((button) => {
    button.classList.toggle("active", button.dataset.flowColor.toLowerCase() === color.toLowerCase());
  });
  if (syncCustom) {
    elements.flowCustomColor.value = color;
  }
}

function syncFlowColorControls(color) {
  if (!color) return;
  elements.flowCustomColor.value = color;
  elements.flowColorSwatches.forEach((button) => {
    button.classList.toggle("active", button.dataset.flowColor.toLowerCase() === color.toLowerCase());
  });
}

function applySelectedFlowColor() {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  if (!node) return;
  node.fill = elements.flowCustomColor.value || flowBuilder.selectedColor;
  selectFlowColor(node.fill);
  renderFlowBuilder();
}

function updateSelectedFlowNodeLabel(value) {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  if (!node) return;
  node.label = String(value || "").trimStart();
  renderFlowNodes();
}

function updateSelectedFlowEdgeLabel(value) {
  const edge = getFlowEdge(flowBuilder.selectedEdgeId);
  if (!edge) return;
  edge.label = String(value || "");
  renderFlowEdges();
}

function updateSelectedFlowNodeType(type) {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  const template = flowShapeTemplates[type];
  if (!node || !template) return;
  const previousType = node.type;
  const previousDefaultFontSize = getDefaultFlowFontSize(previousType);
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  node.type = type;
  node.width = Math.max(node.width, getFlowNodeMinWidth(type));
  node.height = Math.max(node.height, getFlowNodeMinHeight(type));
  node.x = clampFlow(snapFlow(centerX - node.width / 2), 24, flowBuilder.width - node.width - 24);
  node.y = clampFlow(snapFlow(centerY - node.height / 2), 24, flowBuilder.height - node.height - 24);
  if (!node.fontSize || node.fontSize === previousDefaultFontSize) {
    node.fontSize = getDefaultFlowFontSize(type);
  }
  if (node.label === flowShapeTemplates[previousType]?.label || !node.label.trim()) {
    node.label = template.label;
  }
  if (!node.fill || node.fill === flowShapeTemplates[previousType]?.defaultColor) {
    node.fill = template.defaultColor;
  }
  selectFlowColor(node.fill);
  renderFlowBuilder();
}

function updateSelectedFlowNodeFontSize(value) {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  if (!node) return;
  const nextFontSize = clampFlow(Number.parseInt(value, 10) || getDefaultFlowFontSize(node.type), 10, 28);
  node.fontSize = nextFontSize;
  elements.flowNodeFontSizeInput.value = String(nextFontSize);
  renderFlowNodes();
}

function updateSelectedFlowNodeSize(widthValue, heightValue) {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  if (!node) return;
  applyFlowNodeSize(
    node,
    widthValue == null || widthValue === "" ? node.width : widthValue,
    heightValue == null || heightValue === "" ? node.height : heightValue,
  );
  renderFlowBuilder();
}

function getFlowShapeLabel(type) {
  const labels = {
    start: "시작 도형",
    process: "프로세스 도형",
    decision: "판단 도형",
    end: "종료 도형",
    input: "입출력 도형",
    document: "문서 도형",
    manualInput: "수동 입력 도형",
    predefinedProcess: "사전정의 프로세스 도형",
    database: "데이터베이스 도형",
    preparation: "준비 도형",
  };
  return labels[type] || "도형";
}

function getFlowEdge(id) {
  return flowBuilder.edges.find((edge) => edge.id === id) || null;
}

function translatePort(port) {
  const labels = { top: "상단", right: "우측", bottom: "하단", left: "좌측" };
  return labels[port] || port;
}

function getNextDecisionEdgeLabel(nodeId) {
  const count = flowBuilder.edges.filter((edge) => edge.from === nodeId).length;
  if (count === 0) return "예";
  if (count === 1) return "아니오";
  return `분기 ${count + 1}`;
}

function hexToRgb(color) {
  const raw = String(color || "").replace("#", "");
  if (raw.length !== 6) return "47, 111, 228";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function generateScenarioFromFlowChart() {
  if (!flowBuilder.nodes.length) return "";
  const starts = flowBuilder.nodes.filter((node) => node.type === "start");
  const rootNodes = starts.length ? starts : flowBuilder.nodes.slice(0, 1);
  const scenarios = [];

  rootNodes.forEach((startNode, index) => {
    walkFlowScenario(startNode.id, [], [], new Set(), scenarios, index + 1);
  });

  if (!scenarios.length) return "";

  return scenarios
    .map((scenario) => {
      const lines = [`# 시나리오: ${scenario.title}`];
      if (scenario.steps.length) lines.push(...scenario.steps);
      return lines.join("\n");
    })
    .join("\n\n");
}

function walkFlowScenario(nodeId, steps, branchNotes, visited, scenarios, scenarioNumber) {
  if (visited.has(nodeId)) {
    if (steps.length) {
      scenarios.push({
        title: `Flow Scenario ${scenarioNumber}${branchNotes.length ? ` - ${branchNotes.join(" / ")}` : ""}`,
        steps: [...steps, "Then 순환 흐름이 존재하는지 확인한다"],
      });
    }
    return;
  }

  const node = getFlowNode(nodeId);
  if (!node) return;
  const nextVisited = new Set(visited);
  nextVisited.add(nodeId);
  const nextSteps = [...steps];

  if (["process", "input", "document", "manualInput", "predefinedProcess", "database", "preparation"].includes(node.type)) {
    nextSteps.push(normalizeScenarioStepFromNode(node, nextSteps.length));
  }

  const outgoing = flowBuilder.edges.filter((edge) => edge.from === nodeId);
  if (node.type === "end" || !outgoing.length) {
    scenarios.push({
      title: `Flow Scenario ${scenarioNumber}${branchNotes.length ? ` - ${branchNotes.join(" / ")}` : ""}`,
      steps: nextSteps.length ? nextSteps : ["Then 종료 지점까지 흐름이 연결된다"],
    });
    return;
  }

  outgoing.forEach((edge, edgeIndex) => {
    const nextBranchNotes = [...branchNotes];
    if (node.type === "decision") {
      nextBranchNotes.push(edge.label || (edgeIndex === 0 ? "예" : edgeIndex === 1 ? "아니오" : `분기 ${edgeIndex + 1}`));
      nextSteps.push(`Then ${node.label} 판단 결과가 '${edge.label || (edgeIndex === 0 ? "예" : edgeIndex === 1 ? "아니오" : `분기 ${edgeIndex + 1}`)}' 흐름으로 이어진다`);
    }
    walkFlowScenario(edge.to, nextSteps, nextBranchNotes, nextVisited, scenarios, scenarioNumber + edgeIndex);
  });
}

function normalizeScenarioStepFromNode(node, stepIndex) {
  const label = String(node.label || "").trim();
  if (/^(Given|When|Then|And)\b/i.test(label)) return label;
  if (node.type === "input" || node.type === "manualInput") return `When ${label}`;
  if (node.type === "document") return `Then ${label}`;
  if (node.type === "database") return `Then ${label}`;
  if (node.type === "preparation") return `Given ${label}`;
  if (stepIndex === 0) return `Given ${label}`;
  return `When ${label}`;
}

function buildFlowChartFromScenarioText(text) {
  const blocks = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}(?=#\s*시나리오:|#\s*Scenario:)/i)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    resetFlowBuilder(true);
    return;
  }

  resetFlowBuilder(false);
  let column = 0;
  blocks.forEach((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const titleLine = lines.find((line) => /^#\s*(시나리오:|Scenario:)/i.test(line));
    const stepLines = lines.filter((line) => /^(Given|When|Then|And)\b/i.test(line));
    const baseX = 120 + (column * 360);
    let currentY = 96;
    const startNode = createFlowNode("start", baseX, currentY, titleLine ? titleLine.replace(/^#\s*(시나리오:|Scenario:)\s*/i, "").trim() || "시작" : "시작");
    flowBuilder.nodes.push(startNode);
    let previousNode = startNode;
    currentY += 168;

    stepLines.forEach((stepLine) => {
      const isDecision = /(조건|확인|있으면|없으면|성공|실패|가능하면|로그인 여부)/.test(stepLine);
      const nodeType = inferFlowNodeTypeFromScenarioStep(stepLine, isDecision);
      const node = createFlowNode(
        nodeType,
        baseX + (isDecision ? 18 : 0),
        currentY,
        stepLine,
      );
      flowBuilder.nodes.push(node);
      flowBuilder.edges.push(createFlowEdge(previousNode.id, "bottom", node.id, "top"));
      previousNode = node;
      currentY += isDecision ? 228 : 156;
    });

    const endNode = createFlowNode("end", baseX, currentY, "종료");
    flowBuilder.nodes.push(endNode);
    flowBuilder.edges.push(createFlowEdge(previousNode.id, "bottom", endNode.id, "top"));
    column += 1;
  });

  flowBuilder.selectedNodeId = flowBuilder.nodes[0]?.id || null;
  renderFlowBuilder();
}

function inferFlowNodeTypeFromScenarioStep(stepLine, isDecision) {
  if (isDecision) return "decision";
  if (/입력|작성|기입|선택/.test(stepLine)) return "manualInput";
  if (/다운로드|문서|리포트|메일|이메일|영수증/.test(stepLine)) return "document";
  if (/조회|저장|캐시|DB|데이터/.test(stepLine)) return "database";
  if (/준비|초기화|설정|세팅/.test(stepLine)) return "preparation";
  if (/입력값|응답|출력|표시/.test(stepLine)) return "input";
  return "process";
}

function syncScenarioEditors(source, target) {
  if (target.value === source.value) return;
  target.value = source.value;
}

function setSharedScenarioText(value) {
  elements.scenarioText.value = value;
  elements.qaScenarioText.value = value;
  renderQaScenarioCatalog();
}

async function openScenarioIntoEditors() {
  try {
    setScenarioStatus("시나리오 파일을 불러오는 중...");
    const file = await window.autoqa.openScenario();
    if (!file) {
      setScenarioStatus("시나리오 파일 선택이 취소되었습니다.");
      return;
    }
    setSharedScenarioText(file.content);
    setScenarioStatus(file.filePath);
    renderExtractorScenarioPreview();
  } catch (error) {
    setScenarioStatus(error.message || "시나리오 파일을 불러오지 못했습니다.");
  }
}

function setRunning(isRunning) {
  elements.runQa.disabled = isRunning;
  elements.qaRunAgain.disabled = isRunning;
  elements.openScenarioQa.disabled = isRunning;
  elements.extractScenario.disabled = isRunning;
  elements.cancelQa.disabled = false;
  elements.cancelQa.classList.toggle("hidden", !isRunning);
  elements.statusText.textContent = isRunning
    ? "실행 중"
    : elements.statusText.textContent;
  elements.qaSidebarStatusMeta.textContent = isRunning
    ? "진행 상황을 실시간으로 반영하고 있습니다."
    : elements.qaSidebarStatusMeta.textContent;
  elements.qaResultBadge.textContent = isRunning ? "running" : elements.qaResultBadge.textContent;
}

function setQaVisualState(state) {
  qaUiState = state;
  elements.qaStateConfigure.classList.toggle("hidden", state !== "configure");
  elements.qaStateRunning.classList.toggle("hidden", state !== "running");
  elements.qaStateComplete.classList.toggle("hidden", state !== "complete");
  elements.qaStageModeLabel.textContent = {
    configure: "실행 구성",
    running: "실행 모니터링",
    complete: "실행 완료",
  }[state] || "실행";
}

function syncQaExecutionSummary() {
  const totalSteps = qaScenarioCatalog.reduce((sum, item) => sum + item.steps.length, 0);
  const selected = qaScenarioCatalog.find((item) => item.index === qaSelectedScenarioIndex);
  const browserLabel = elements.browserSelect.options[elements.browserSelect.selectedIndex]?.textContent || "Chromium";
  const workers = Math.max(1, Number(elements.workers.value) || 1);
  elements.qaSummaryStepCount.textContent = String(totalSteps);
  elements.qaSummaryBrowser.textContent = browserLabel.replace(/\s*\(.+\)$/, "");
  elements.qaSummaryWorkers.textContent = String(workers);
  if (qaUiState === "configure") {
    elements.estimatedTime.textContent = totalSteps ? `${Math.max(1, Math.ceil(totalSteps * 4 / 60))}분` : "-";
  }
  elements.qaPreviewLocation.textContent = getQaDisplayBaseUrl();
  renderQaSelectedTags(selected);
}

function getQaDisplayBaseUrl() {
  return normalizeUrlInput(elements.qaBaseUrl.value) || "https://example.com";
}

function renderQaSelectedTags(selected) {
  const tags = selected?.tags?.length ? selected.tags : [];
  elements.qaSelectedTags.innerHTML = tags.length
    ? tags.map((tag) => `<span class="qa-tag">${escapeHtml(tag)}</span>`).join("")
    : `<span class="qa-tag-empty">선택된 태그가 없습니다.</span>`;
}

function renderQaWorkerCards(progress = latestProgress) {
  const workerCount = Math.max(1, Math.min(Number(elements.workers.value) || 1, 4));
  const items = qaVisibleScenarioCatalog.length ? qaVisibleScenarioCatalog : qaScenarioCatalog;
  const completed = Number(progress?.scenarioCompleted) || 0;
  const runningIndex = Math.min(completed, Math.max(items.length - 1, 0));
  elements.qaWorkerGrid.innerHTML = Array.from({ length: workerCount }, (_, index) => {
    const scenario = items[index] || items[runningIndex] || null;
    const title = scenario?.title || `대기 워커 ${index + 1}`;
    const tone = qaUiState === "complete"
      ? "done"
      : qaUiState === "running" && index === (runningIndex % workerCount)
        ? "running"
        : "idle";
    const status = tone === "done" ? "완료" : tone === "running" ? "실행 중" : "대기";
    return `
      <article class="qa-worker-card qa-worker-card-${tone}">
        <span>워커 ${index + 1}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${status}</p>
      </article>
    `;
  }).join("");
}

function clearQaLogs() {
  qaRunLogs = [];
  renderQaLogs();
}

function appendQaLog(message, tone = "info") {
  const text = String(message || "").trim();
  if (!text) return;
  if (qaRunLogs.at(-1)?.message === text) return;
  qaRunLogs.push({
    time: new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date()),
    message: text,
    tone,
  });
  qaRunLogs = qaRunLogs.slice(-40);
  renderQaLogs();
}

function renderQaLogs() {
  const markup = qaRunLogs.length
    ? qaRunLogs.map((item) => `
      <div class="qa-log-entry qa-log-entry-${item.tone}">
        <span>[${item.time}]</span>
        <strong>${escapeHtml(item.message)}</strong>
      </div>
    `).join("")
    : `<div class="qa-log-entry"><span>[--:--:--]</span><strong>아직 실행 로그가 없습니다.</strong></div>`;
  elements.qaLiveLog.innerHTML = markup;
  elements.qaCompleteLog.innerHTML = markup;
}

function syncQaCompletionSummary(result, fallback = null) {
  const summary = result?.summary;
  const total = summary?.scenarioTotal ?? summary?.total ?? 0;
  const passed = summary?.scenarioPassed ?? summary?.passed ?? 0;
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  elements.qaPassRate.textContent = `${passRate}%`;
  elements.qaCompletionDuration.textContent = formatDuration(summary?.durationMs || 0);
  elements.qaCompletionSteps.textContent = String(summary?.total ?? total ?? 0);
  elements.qaCompletionBrowser.textContent = summary?.browserLabel || "-";
  elements.qaCompletionMessage.textContent = fallback
    ? (fallback.cancelled ? "실행이 중단되었습니다." : fallback.error?.message || "실행 중 오류가 발생했습니다.")
    : total
      ? `전체 ${total}개 시나리오 중 ${passed}개가 통과했습니다.`
      : "아직 완료된 실행이 없습니다.";
}

function openEmbeddedExtractor(config) {
  if (!config?.targetUrl || !config?.preloadUrl) {
    setScenarioStatus("시나리오 추출 화면 설정이 올바르지 않습니다.");
    return;
  }
  elements.extractorUrl.textContent = config.targetUrl;
  seedExtractorMetadata(config.targetUrl);
  renderExtractorScenarioPreview();
  renderExtractorRecorderState();
  elements.extractorWebview.setAttribute("preload", config.preloadUrl);
  elements.extractorWebview.removeAttribute("src");
  resetExtractorFloatingToolPosition();
  setExtractorSidebarOpen(false);
  syncExtractorResponsiveLayout();
  setExtractorResizeLoading(false);
  startExtractorSizing();
  window.addEventListener("resize", handleExtractorWindowResize);
  elements.extractorWebview.addEventListener(
    "did-start-loading",
    () => {
      elements.extractorUrl.textContent = config.targetUrl;
      setExtractorResizeLoading(true);
    },
    { once: true },
  );
  elements.extractorWebview.addEventListener(
    "dom-ready",
    () => {
      setScenarioStatus("시나리오 추출 화면 로딩이 완료되었습니다.");
      if (typeof elements.extractorWebview.setZoomFactor === "function") {
        elements.extractorWebview.setZoomFactor(1);
      }
      normalizeExtractorGuestViewport();
      sendExtractorRecorderCommand("refresh");
    },
    { once: true },
  );
  elements.extractorWebview.addEventListener(
    "did-finish-load",
    () => {
      sizeExtractorWebview();
      normalizeExtractorGuestViewport();
      setExtractorResizeLoading(false);
    },
    { once: true },
  );
  elements.extractorWebview.addEventListener(
    "did-stop-loading",
    () => {
      setExtractorResizeLoading(false);
    },
    { once: true },
  );
  elements.extractorWebview.addEventListener(
    "did-fail-load",
    (_event) => {
      setExtractorResizeLoading(false);
      setScenarioStatus("시나리오 추출 화면 로딩에 실패했습니다.");
    },
    { once: true },
  );
  elements.extractorWebview.setAttribute("src", config.targetUrl);
}

function openExtractorRoutePending() {
  setPage("extractor");
  elements.extractorUrl.textContent = "시나리오 추출 화면을 준비하고 있습니다...";
  elements.extractorWebview.removeAttribute("src");
  renderExtractorScenarioPreview();
  renderExtractorRecorderState();
  setExtractorSidebarOpen(false);
  syncExtractorResponsiveLayout();
  setExtractorResizeLoading(false);
}

function seedExtractorMetadata(targetUrl) {
  const pathname = parsePathname(targetUrl);
  const inferredFeature = inferFeatureFromUrl(targetUrl);
  const inferredSuite = pathname === "/" ? "smoke" : "full";
  const inferredTags = ["extracted", ...pathname.split("/").filter(Boolean)]
    .slice(0, 4)
    .join(", ");

  if (
    !elements.extractorRecorderTitle.value.trim() ||
    elements.extractorRecorderTitle.value === "추출 시나리오"
  ) {
    elements.extractorRecorderTitle.value =
      inferredFeature.split("/").at(-1) || "추출 시나리오";
  }
  if (!elements.extractorRecorderFeature.value.trim()) {
    elements.extractorRecorderFeature.value = inferredFeature;
  }
  if (!elements.extractorRecorderTags.value.trim()) {
    elements.extractorRecorderTags.value = inferredTags;
  }
  elements.extractorRecorderSuite.value = inferredSuite;
}

function parsePathname(targetUrl) {
  try {
    return new URL(targetUrl).pathname || "/";
  } catch {
    return "/";
  }
}

function inferFeatureFromUrl(targetUrl) {
  const pathname = parsePathname(targetUrl);
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return "홈";
  return parts.map((part) => humanizeSegment(part)).join("/");
}

function humanizeSegment(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function teardownExtractorRoute() {
  elements.extractorWebview.removeAttribute("src");
  setExtractorSidebarOpen(false);
  window.removeEventListener("resize", handleExtractorWindowResize);
  setExtractorResizeLoading(false);
  stopExtractorSizing();
}

function initializeExtractorFloatingTool() {
  if (!elements.extractorFloatingTool || !elements.extractorToolHandle) return;

  const startDrag = (event) => {
    const pointer = getPointerPosition(event);
    if (!pointer) return;
    const rect = elements.extractorFloatingTool.getBoundingClientRect();
    const stageRect = elements.extractorWebview.closest(".extractor-webview-stage")?.getBoundingClientRect();
    if (!stageRect) return;
    extractorToolDragState = {
      offsetX: pointer.x - rect.left,
      offsetY: pointer.y - rect.top,
      stageRect,
    };
    elements.extractorFloatingTool.classList.add("dragging");
    event.preventDefault();
  };

  const continueDrag = (event) => {
    if (!extractorToolDragState) return;
    const pointer = getPointerPosition(event);
    if (!pointer) return;
    const toolWidth = elements.extractorFloatingTool.offsetWidth;
    const toolHeight = elements.extractorFloatingTool.offsetHeight;
    const nextLeft = clampDragPosition(
      pointer.x - extractorToolDragState.stageRect.left - extractorToolDragState.offsetX,
      16,
      extractorToolDragState.stageRect.width - toolWidth - 16,
    );
    const nextTop = clampDragPosition(
      pointer.y - extractorToolDragState.stageRect.top - extractorToolDragState.offsetY,
      24,
      extractorToolDragState.stageRect.height - toolHeight - 24,
    );
    elements.extractorFloatingTool.style.left = `${nextLeft}px`;
    elements.extractorFloatingTool.style.top = `${nextTop}px`;
    elements.extractorFloatingTool.style.right = "auto";
  };

  const endDrag = () => {
    if (!extractorToolDragState) return;
    extractorToolDragState = null;
    elements.extractorFloatingTool.classList.remove("dragging");
  };

  elements.extractorToolHandle.addEventListener("mousedown", startDrag);
  elements.extractorToolHandle.addEventListener("touchstart", startDrag, { passive: false });
  window.addEventListener("mousemove", continueDrag);
  window.addEventListener("touchmove", continueDrag, { passive: false });
  window.addEventListener("mouseup", endDrag);
  window.addEventListener("touchend", endDrag);
}

function resetExtractorFloatingToolPosition() {
  if (!elements.extractorFloatingTool) return;
  elements.extractorFloatingTool.style.top = "32px";
  elements.extractorFloatingTool.style.left = "32px";
  elements.extractorFloatingTool.style.right = "auto";
}

function getPointerPosition(event) {
  if (event.touches?.length) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }
  return null;
}

function clampDragPosition(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function renderExtractorScenarioPreview() {
  const scenario = elements.scenarioText.value.trim();
  const lineCount = scenario ? scenario.split(/\r\n|\r|\n/).length : 0;
  elements.extractorScenarioPreview.textContent =
    scenario || "현재 작성된 시나리오가 없습니다.";
  elements.extractorScenarioCount.textContent = `${lineCount}줄`;
}

function countScenarioRunsFallback(input) {
  const text = String(input || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!text) return 1;
  return Math.max(
    1,
    text
      .split(/\n(?=#{1,3}\s*시나리오:|\n?Scenario:|\n?시나리오:)/i)
      .map((block) => block.trim())
      .filter(Boolean).length,
  );
}

function parseQaScenarioCatalog(input) {
  const text = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  return text
    .split(/\n(?=#\s*시나리오:|#\s*Scenario:)/i)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split("\n");
      const titleLine = lines[0] || "";
      const title = titleLine.replace(/^#\s*(시나리오|Scenario)\s*:\s*/i, "").trim();
      const metadata = {};
      const steps = [];
      for (const line of lines.slice(1)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const metaMatch = trimmed.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
        if (metaMatch) {
          metadata[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
          continue;
        }
        if (/^(Given|When|Then|And)\b/i.test(trimmed)) {
          steps.push(trimmed);
        }
      }
      const tags = (metadata.tags || "")
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);
      return {
        index,
        title: title || `시나리오 ${index + 1}`,
        scenarioId: metadata.scenarioid || `SCN-${String(index + 1).padStart(3, "0")}`,
        tcId: metadata.tcid || "-",
        feature: metadata.feature || "-",
        suite: metadata.suite || "-",
        tags,
        steps,
      };
    });
}

function renderQaScenarioCatalog(preferredTitle = "") {
  qaScenarioCatalog = parseQaScenarioCatalog(elements.qaScenarioText.value);
  qaVisibleScenarioCatalog = filterQaScenarioCatalog(qaScenarioCatalog, qaScenarioFilterKeyword);
  elements.qaScenarioCount.textContent = qaScenarioCatalog.length === qaVisibleScenarioCatalog.length
    ? String(qaScenarioCatalog.length)
    : `${qaVisibleScenarioCatalog.length} / ${qaScenarioCatalog.length}`;
  elements.qaScenarioList.innerHTML = "";

  if (!qaScenarioCatalog.length) {
    qaSelectedScenarioIndex = 0;
    elements.qaScenarioList.innerHTML = `<div class="qa-scenario-empty">불러온 시나리오가 없습니다.</div>`;
    elements.qaScenarioMeta.innerHTML = "";
    elements.qaScenarioSteps.innerHTML = `<p class="qa-scenario-empty">시나리오 생성 페이지에서 작성한 내용을 붙여넣거나, 파일을 불러오세요.</p>`;
    elements.qaSelectedScenarioStatus.textContent = "선택된 시나리오 없음";
    syncQaExecutionSummary();
    renderQaWorkerCards();
    return;
  }

  if (!qaVisibleScenarioCatalog.length) {
    elements.qaScenarioList.innerHTML = `<div class="qa-scenario-empty">필터와 일치하는 시나리오가 없습니다.</div>`;
    elements.qaScenarioMeta.innerHTML = "";
    elements.qaScenarioSteps.innerHTML = `<p class="qa-scenario-empty">검색어를 지우거나 다른 키워드로 다시 시도하세요.</p>`;
    elements.qaSelectedScenarioStatus.textContent = "필터 결과 없음";
    syncQaExecutionSummary();
    renderQaWorkerCards();
    return;
  }

  const preferredIndex = preferredTitle
    ? qaVisibleScenarioCatalog.findIndex((item) => item.title.includes(preferredTitle))
    : -1;
  const currentVisibleIndex = qaVisibleScenarioCatalog.findIndex((item) => item.index === qaSelectedScenarioIndex);
  const nextVisibleItem = preferredIndex >= 0
    ? qaVisibleScenarioCatalog[preferredIndex]
    : qaVisibleScenarioCatalog[Math.max(0, currentVisibleIndex)];
  qaSelectedScenarioIndex = nextVisibleItem?.index ?? qaVisibleScenarioCatalog[0].index;

  for (const item of qaVisibleScenarioCatalog) {
    const article = document.createElement("button");
    article.type = "button";
    article.className = "qa-scenario-card";
    article.dataset.index = String(item.index);
    article.innerHTML = `
      <span class="qa-scenario-card-id">${escapeHtml(item.scenarioId)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <div class="qa-scenario-tags">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    `;
    article.addEventListener("click", () => {
      setQaScenarioSelection(item.index);
    });
    elements.qaScenarioList.appendChild(article);
  }

  setQaScenarioSelection(qaSelectedScenarioIndex);
  renderQaWorkerCards();
}

function setQaScenarioSelection(index) {
  const selected = qaScenarioCatalog.find((item) => item.index === index)
    || qaVisibleScenarioCatalog[0]
    || qaScenarioCatalog[0];
  if (!selected) return;
  qaSelectedScenarioIndex = selected.index;
  elements.qaScenarioList.querySelectorAll(".qa-scenario-card").forEach((card) => {
    card.classList.toggle("selected", Number(card.dataset.index) === qaSelectedScenarioIndex);
  });

  elements.qaScenarioMeta.innerHTML = `
    <p><strong>scenarioId:</strong> ${escapeHtml(selected.scenarioId)}</p>
    <p><strong>tcId:</strong> ${escapeHtml(selected.tcId)}</p>
    <p><strong>feature:</strong> ${escapeHtml(selected.feature)}</p>
    <p><strong>suite:</strong> ${escapeHtml(selected.suite)}</p>
  `;
  elements.qaScenarioSteps.innerHTML = selected.steps.length
    ? selected.steps.map((step) => `<p>${highlightScenarioKeyword(step)}</p>`).join("")
    : `<p class="qa-scenario-empty">정의된 단계가 없습니다.</p>`;
  elements.qaSelectedScenarioStatus.textContent = `${selected.scenarioId} 선택됨`;
  syncQaExecutionSummary();
}

function filterQaScenarioCatalog(items, keyword) {
  if (!keyword) return items;
  return items.filter((item) => {
    const haystack = [
      item.title,
      item.scenarioId,
      item.tcId,
      item.feature,
      item.suite,
      ...item.tags,
      ...item.steps,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

function highlightScenarioKeyword(step) {
  return escapeHtml(step).replace(
    /^(Given|When|Then|And)\b/,
    '<span class="qa-step-keyword">$1</span>',
  );
}

async function refreshHistory() {
  const history = await window.autoqa.loadHistory().catch(() => null);
  renderHistory(history);
}

function renderHistory(history) {
  if (!history) return;
  elements.historyRunCount.textContent = String(history.totals?.runCount || 0);
  elements.historyPassRate.textContent = `${history.totals?.averagePassRate || 0}%`;
  elements.historyRegressionCount.textContent = String(
    history.regressions || 0,
  );
  elements.historySummary.textContent = history.totals?.runCount
    ? `최근 ${history.totals.runCount}회 실행을 기준으로 품질 흐름을 요약했습니다.`
    : "아직 저장된 실행 이력이 없습니다.";
  renderHistoryList(
    elements.historyRecentRuns,
    history.recentRuns,
    (item) => `
      <div class="history-item">
        <strong>${formatHistoryDate(item.createdAt)}</strong>
        <span>Pass ${item.passRate}% · 실패 ${item.failed} · 환경 ${item.environmentCount}</span>
      </div>
    `,
    "최근 실행 이력이 없습니다.",
  );
  renderHistoryList(
    elements.historyHotspots,
    history.hotspots,
    (item) => `
      <div class="history-item">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.featurePath)} · 실패 ${item.failures}회</span>
      </div>
    `,
    "반복 실패 Hot Spot이 없습니다.",
  );
}

function renderHistoryList(target, items, renderItem, emptyMessage) {
  if (!items?.length) {
    target.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }
  target.innerHTML = items.map(renderItem).join("");
}

function formatSuiteLabel(value) {
  const suite = String(value || "")
    .trim()
    .toLowerCase();
  const labels = {
    smoke: "핵심 점검 (smoke)",
    full: "전체 점검 (full)",
    regression: "회귀 점검 (regression)",
    edge: "예외/경계 점검 (edge)",
    custom: "사용자 정의 (custom)",
  };
  return labels[suite] || `${suite || "-"}${suite ? ` (${suite})` : ""}`;
}

function renderRunCounts({ total, passed, failed }) {
  elements.totalCount.textContent = String(total ?? 0);
  elements.passCount.textContent = String(passed ?? 0);
  elements.failCount.textContent = String(failed ?? 0);
  const completed = Math.max(0, (passed ?? 0) + (failed ?? 0));
  elements.qaLiveStats.innerHTML = `
    <div><span>전체</span><strong>${total ?? 0}</strong></div>
    <div><span>완료</span><strong>${completed}</strong></div>
    <div><span>실패</span><strong>${failed ?? 0}</strong></div>
  `;
}

function renderAppUpdateState(state = {}) {
  if (state.type === "disabled") return;
  const titleByType = {
    checking: "업데이트 확인 중",
    available: "새 업데이트 발견",
    downloading: "업데이트 다운로드 중",
    downloaded: "업데이트 준비 완료",
    idle: "업데이트 상태",
    error: "업데이트 오류",
    installing: "업데이트 설치 중",
  };
  elements.updateBanner.classList.remove("hidden");
  elements.updateBannerTitle.textContent =
    titleByType[state.type] || "업데이트";
  elements.updateBannerMessage.textContent =
    state.message || "업데이트 정보를 불러오는 중입니다.";
  elements.installUpdate.classList.toggle(
    "hidden",
    state.type !== "downloaded",
  );
  elements.installUpdate.disabled = false;
}

function loadUrlHistory() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(urlHistoryStorageKey) || "[]",
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBaseUrlHistory(value) {
  const normalized = normalizeUrlInput(value);
  if (!normalized) return;
  const next = [
    { url: normalized, savedAt: Date.now() },
    ...loadUrlHistory().filter((item) => item?.url !== normalized),
  ].slice(0, maxUrlHistoryItems);
  window.localStorage.setItem(urlHistoryStorageKey, JSON.stringify(next));
  renderUrlHistory();
}

function normalizeUrlInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function setUrlHistoryOpen(isOpen, target = "all") {
  if (target === "qa" || target === "all") {
    elements.urlHistoryMenu.classList.toggle("hidden", !isOpen);
  }
  if (target === "scenario" || target === "all") {
    elements.scenarioUrlHistoryMenu.classList.toggle("hidden", !isOpen);
  }
}

function renderUrlHistory() {
  const items = loadUrlHistory();
  if (!items.length) {
    const empty = `
      <div class="url-history-empty">아직 저장된 URL 기록이 없습니다. 한 번 실행하면 다음부터 여기서 빠르게 다시 시작할 수 있습니다.</div>
    `;
    elements.urlHistoryList.innerHTML = empty;
    elements.scenarioUrlHistoryList.innerHTML = empty;
    elements.clearUrlHistory.disabled = true;
    elements.clearScenarioUrlHistory.disabled = true;
    return;
  }

  elements.clearUrlHistory.disabled = false;
  elements.clearScenarioUrlHistory.disabled = false;
  const historyMarkup = items
    .map(
      (item, index) => `
      <div class="url-history-item">
        <div class="url-history-meta">
          <strong>${escapeHtml(item.url)}</strong>
          <span>${formatHistoryDate(item.savedAt)}에 저장됨</span>
        </div>
        <button class="secondary compact-button url-history-apply" type="button" data-history-index="${index}">퀵 스타트</button>
      </div>
    `,
    )
    .join("");
  elements.urlHistoryList.innerHTML = historyMarkup;
  elements.scenarioUrlHistoryList.innerHTML = historyMarkup;

  [
    elements.urlHistoryList,
    elements.scenarioUrlHistoryList,
  ]
    .forEach((container) => container
    .querySelectorAll("[data-history-index]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const selected = items[Number(button.dataset.historyIndex)];
        if (!selected?.url) return;
        elements.qaBaseUrl.value = selected.url;
        elements.scenarioBaseUrl.value = selected.url;
        setUrlHistoryOpen(false, "all");
        if (container === elements.scenarioUrlHistoryList) {
          elements.scenarioBaseUrl.focus();
        } else {
          elements.qaBaseUrl.focus();
        }
      });
    }));
}

function formatHistoryDate(value) {
  if (!value) return "방금";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "최근";
  }
}

function getCommandPaletteActions() {
  return [
    {
      id: "open-qa",
      label: "실행 콘솔 열기",
      keywords: ["qa", "실행", "console", "run"],
      run: () => setPage("qa"),
    },
    {
      id: "open-scenario",
      label: "시나리오 워크스페이스 열기",
      keywords: ["scenario", "builder", "시나리오", "편집"],
      run: () => setPage("scenario"),
    },
    {
      id: "open-home",
      label: "운영 대시보드 열기",
      keywords: ["home", "dashboard", "요약", "히스토리"],
      run: () => setPage("home"),
    },
    {
      id: "run-qa",
      label: "현재 설정으로 QA 실행",
      keywords: ["run", "execute", "qa", "실행"],
      run: () => {
        setPage("qa");
        elements.runQa.click();
      },
    },
    {
      id: "open-file",
      label: "시나리오 파일 불러오기",
      keywords: ["open", "import", "scenario", "불러오기"],
      run: () => {
        setPage("scenario");
        openScenarioIntoEditors();
      },
    },
    {
      id: "save-scenario",
      label: "현재 시나리오 저장",
      keywords: ["save", "scenario", "저장"],
      run: () => {
        setPage("scenario");
        saveCurrentScenario();
      },
    },
    {
      id: "extract-scenario",
      label: "URL에서 시나리오 추출 시작",
      keywords: ["extract", "scenario", "추출", "url"],
      run: () => {
        setPage("scenario");
        elements.extractScenario.click();
      },
    },
  ];
}

function setCommandPaletteOpen(isOpen) {
  if (!elements.commandPalette) return;
  elements.commandPalette.classList.toggle("hidden", !isOpen);
  if (isOpen) {
    renderCommandPalette("");
    elements.commandPaletteInput.value = "";
    window.requestAnimationFrame(() => {
      elements.commandPaletteInput.focus();
    });
    return;
  }
  elements.commandPaletteInput.blur();
}

function renderCommandPalette(searchTerm = "") {
  if (!elements.commandPaletteList) return;
  const normalized = String(searchTerm || "").trim().toLowerCase();
  const actions = getCommandPaletteActions().filter((action) => {
    if (!normalized) return true;
    const haystack = `${action.label} ${action.keywords.join(" ")}`.toLowerCase();
    return haystack.includes(normalized);
  });
  if (!actions.length) {
    elements.commandPaletteList.innerHTML = `<div class="qa-scenario-empty">검색 결과가 없습니다.</div>`;
    return;
  }
  elements.commandPaletteList.innerHTML = actions
    .map((action) => `
      <button class="command-palette-item" type="button" data-command-id="${action.id}">
        <strong>${escapeHtml(action.label)}</strong>
        <span>${escapeHtml(action.keywords.join(" · "))}</span>
      </button>
    `)
    .join("");
  elements.commandPaletteList.querySelectorAll("[data-command-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = actions.find((item) => item.id === button.dataset.commandId);
      if (!action) return;
      setCommandPaletteOpen(false);
      action.run();
    });
  });
}

function setScenarioAccordionOpen(isOpen) {
  if (!elements.scenarioAccordion) return;
  elements.scenarioAccordion.classList.toggle("open", isOpen);
  if (elements.toggleScenarioAccordion) {
    elements.toggleScenarioAccordion.textContent = isOpen ? "접기" : "펼치기";
  }
}

function setScenarioStatus(message) {
  if (!elements.scenarioFile) return;
  elements.scenarioFile.textContent = String(message || "").trim() || "Markdown 형식 권장";
}

function syncPreviewVisibility() {
  if (elements.headless.checked) {
    if (!elements.progressPreviewImage.classList.contains("visible")) {
      elements.progressPreviewEmpty.classList.remove("hidden");
      elements.progressPreviewEmpty.textContent = "테스트 화면을 기다리는 중입니다.";
      elements.progressPreviewTitle.textContent = "QA 실행 준비";
      elements.progressPreviewUrl.textContent = "-";
      elements.qaPreviewLocation.textContent = getQaDisplayBaseUrl();
    }
    return;
  }

  elements.progressPreviewImage.removeAttribute("src");
  elements.progressPreviewImage.classList.remove("visible");
  elements.progressPreviewEmpty.classList.remove("hidden");
  elements.progressPreviewEmpty.textContent =
    "Headless를 켜면 실시간 테스트 화면이 여기에 표시됩니다.";
  elements.progressPreviewTitle.textContent = "미리보기 비활성화";
  elements.progressPreviewUrl.textContent = "Headless를 켜면 미리보기 활성화";
  elements.qaPreviewLocation.textContent = getQaDisplayBaseUrl();
}

function resetScreenPreview(scenarioTotal = 0, previewEnabled = true) {
  elements.progressPreviewSummary.textContent = `전체 ${scenarioTotal}개 / 통과 0 / 실패 0`;
  elements.progressPreviewImage.removeAttribute("src");
  elements.progressPreviewImage.classList.remove("visible");
  elements.progressPreviewEmpty.classList.remove("hidden");
  elements.progressPreviewEmpty.textContent = previewEnabled
    ? "테스트 화면을 기다리는 중입니다."
    : "Headless를 켜면 실시간 테스트 화면이 여기에 표시됩니다.";
  elements.progressPreviewTitle.textContent = previewEnabled
    ? "QA 실행 준비"
    : "미리보기 비활성화";
  elements.progressPreviewUrl.textContent = previewEnabled
    ? "-"
    : "Headless를 켜면 미리보기 활성화";
  elements.qaPreviewLocation.textContent = previewEnabled
    ? getQaDisplayBaseUrl()
    : getQaDisplayBaseUrl();
}

function renderScreenPreview(progress) {
  if (!elements.headless.checked) return;
  if (!progress.previewImage) return;
  elements.progressPreviewImage.src = progress.previewImage;
  elements.progressPreviewImage.classList.add("visible");
  elements.progressPreviewEmpty.classList.add("hidden");
  elements.progressPreviewTitle.textContent =
    progress.currentTitle || "테스트 화면 업데이트";
  elements.progressPreviewUrl.textContent = progress.previewUrl || "-";
  elements.qaPreviewLocation.textContent = progress.previewUrl || getQaDisplayBaseUrl();
  renderQaScenarioCatalog(progress.currentTitle || "");
}

async function saveCurrentScenario() {
  const content = elements.scenarioText.value.trim();
  if (!content) {
    setScenarioStatus("저장할 시나리오가 없습니다");
    return;
  }

  const buttons = [elements.saveScenario, elements.saveExtractorScenario];
  buttons.forEach((button) => {
    button.disabled = true;
  });

  try {
    const result = await window.autoqa.saveScenario({
      content,
      title: inferScenarioTitle(content),
    });
    if (!result) return;
    setScenarioStatus(result.filePath);
    renderExtractorScenarioPreview();
  } catch (error) {
    setScenarioStatus(error.message || "시나리오 저장 실패");
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function inferScenarioTitle(content) {
  const match = content.match(
    /^(?:#{1,3}\s*)?(?:시나리오|Scenario)\s*:\s*(.+)$/im,
  );
  return match?.[1]?.trim() || "autoqa-scenario";
}

function renderExtractorRecorderState(state = {}) {
  const steps = Array.isArray(state.steps) ? state.steps : [];
  elements.extractorTogglePin.textContent = state.enabled
    ? "핀 추가 끄기"
    : "핀 추가 켜기";
  elements.extractorRecorderCount.textContent = `${steps.length}개`;
  elements.extractorRecorderSteps.innerHTML = steps.length
    ? steps
        .map(
          (step, index) =>
            `<div class="extractor-recorder-step"><strong>${index + 1}.</strong> ${escapeHtml(step)}</div>`,
        )
        .join("")
    : `<div class="extractor-recorder-step">아직 추가된 핀이 없습니다.</div>`;
}

async function sendExtractorRecorderCommand(action, detail = {}) {
  if (typeof elements.extractorWebview.executeJavaScript !== "function") return;
  const payload = JSON.stringify({ action, ...detail });
  await elements.extractorWebview
    .executeJavaScript(
      `
      document.dispatchEvent(new CustomEvent('autoqa-recorder-command', {
        detail: ${payload}
      }));
    `,
    )
    .catch(() => {});
}

function startExtractorSizing() {
  stopExtractorSizing();
  runExtractorViewportRender();
  window.requestAnimationFrame(() => {
    runExtractorViewportRender();
    window.requestAnimationFrame(runExtractorViewportRender);
  });

  if (typeof ResizeObserver !== "undefined") {
    extractorResizeObserver = new ResizeObserver(runExtractorViewportRender);
    extractorResizeObserver.observe(elements.extractorShell);
  }
}

function stopExtractorSizing() {
  extractorResizeObserver?.disconnect();
  extractorResizeObserver = null;
  extractorFrameObserver?.disconnect();
  extractorFrameObserver = null;
  if (extractorViewportSyncTimer) {
    window.clearTimeout(extractorViewportSyncTimer);
    extractorViewportSyncTimer = null;
  }
  if (extractorResizeSettledTimer) {
    window.clearTimeout(extractorResizeSettledTimer);
    extractorResizeSettledTimer = null;
  }
}

function runExtractorViewportRender() {
  syncExtractorResponsiveLayout();
  sizeExtractorWebview();
  if (extractorViewportSyncTimer) {
    window.clearTimeout(extractorViewportSyncTimer);
  }
  extractorViewportSyncTimer = window.setTimeout(() => {
    rerenderExtractorGuestViewport();
  }, 40);
}

function handleExtractorWindowResize() {
  if (currentPage !== "extractor") return;
  syncExtractorResponsiveLayout();

  const webview = elements.extractorWebview;

  setExtractorResizeLoading(true);

  const { width, height } = getExtractorWebviewSize();

  webview.style.width = `${width}px`;
  webview.style.height = `${height}px`;

  void webview.offsetWidth;

  webview.style.width = "100%";
  webview.style.height = `${height}px`;

  forceIframeReflow(webview);

  if (extractorResizeSettledTimer) {
    clearTimeout(extractorResizeSettledTimer);
  }

  extractorResizeSettledTimer = setTimeout(async () => {
    try {
      await rerenderExtractorGuestViewport();
    } finally {
      setExtractorResizeLoading(false);
    }
  }, 180);
}

function forceIframeReflow(webview) {
  const frames = [
    webview.querySelector("iframe"),
    webview.shadowRoot?.querySelector("iframe"),
  ].filter(Boolean);

  frames.forEach((frame) => {
    frame.style.width = "99.9%";

    void frame.offsetWidth;

    frame.style.width = "100%";
  });
}

function setExtractorResizeLoading(isLoading) {
  elements.extractorResizeOverlay.classList.toggle("hidden", !isLoading);
}

function isExtractorCompactLayout() {
  return elements.extractorShell.clientWidth <= 1180;
}

function syncExtractorResponsiveLayout() {
  const isCompact = isExtractorCompactLayout();
  elements.extractorShell.classList.toggle("compact", isCompact);
  elements.extractorShell.classList.toggle("sidebar-open", extractorSidebarOpen);
  elements.toggleExtractorSidebar.textContent = extractorSidebarOpen
    ? "현재 시나리오 닫기"
    : "현재 시나리오 열기";
  elements.toggleExtractorSidebar.setAttribute(
    "aria-expanded",
    extractorSidebarOpen ? "true" : "false",
  );
  elements.closeExtractorSidebar.hidden = !extractorSidebarOpen;
  elements.extractorScenarioPreview.closest(".extractor-sidebar")?.setAttribute(
    "aria-hidden",
    extractorSidebarOpen ? "false" : "true",
  );
}

function setExtractorSidebarOpen(nextOpen) {
  extractorSidebarOpen = Boolean(nextOpen);
  syncExtractorResponsiveLayout();
}

function toggleExtractorSidebar() {
  setExtractorSidebarOpen(!extractorSidebarOpen);
}

function sizeExtractorWebview() {
  const { height, width } = getExtractorWebviewSize();
  elements.extractorWebview.setAttribute("minheight", String(height));
  elements.extractorWebview.setAttribute("maxheight", String(height));
  elements.extractorWebview.setAttribute("minwidth", String(width));
  elements.extractorWebview.setAttribute("maxwidth", String(width));
  elements.extractorWebview.style.height = `${height}px`;
  elements.extractorWebview.style.width = `${width}px`;
  sizeExtractorHostFrame(height, width);
}

function getExtractorWebviewSize() {
  const content = elements.extractorShell.querySelector(".extractor-content");
  const contentRect = content?.getBoundingClientRect();
  const webviewRect = elements.extractorWebview.getBoundingClientRect();
  const toolbar = elements.extractorShell.querySelector(".extractor-toolbar");
  const toolbarHeight = toolbar?.offsetHeight || 62;
  const height =
    contentRect?.height || elements.extractorShell.clientHeight - toolbarHeight;
  const width =
    webviewRect.width ||
    contentRect?.width ||
    elements.extractorShell.clientWidth;
  return {
    height: Math.max(420, Math.floor(height)),
    width: Math.max(320, Math.floor(width)),
  };
}

function sizeExtractorHostFrame(height, width) {
  elements.extractorWebview.style.display = "flex";
  elements.extractorWebview.style.alignItems = "stretch";

  const styleId = "autoqa-webview-host-frame-fix";
  let style = elements.extractorWebview.querySelector(`#${styleId}`);
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    elements.extractorWebview.appendChild(style);
  }

  style.textContent = `
    :host { display: flex !important; align-items: stretch !important; }
    iframe {
      flex: 1 1 auto !important;
      width: 100% !important;
      height: 100% !important;
      min-height: ${height}px !important;
      max-height: none !important;
      border: 0 !important;
    }
  `;

  const hostFrames = [
    elements.extractorWebview.querySelector("iframe"),
    elements.extractorWebview.shadowRoot?.querySelector("iframe"),
  ].filter(Boolean);

  for (const frame of hostFrames) {
    frame.style.flex = "1 1 auto";
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = `${height}px`;
    frame.style.maxHeight = "none";
    frame.style.border = "0";
  }
}

async function resetExtractorScroll() {
  if (typeof elements.extractorWebview.executeJavaScript !== "function") return;
  await elements.extractorWebview
    .executeJavaScript(
      `
    (() => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      requestAnimationFrame(() => window.scrollTo(0, 0));
    })();
  `,
    )
    .catch(() => {});
}

async function normalizeExtractorGuestViewport() {
  sizeExtractorWebview();
  await resetExtractorScroll();

  if (typeof elements.extractorWebview.executeJavaScript !== "function") return;
  const { height: hostViewportHeight, width: hostViewportWidth } =
    getExtractorWebviewSize();
  await elements.extractorWebview
    .executeJavaScript(
      `
    (() => {
      const styleId = 'autoqa-guest-viewport-fix';
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.documentElement.appendChild(style);
      }
      const viewportHeight = Math.max(window.innerHeight, ${hostViewportHeight});
      const viewportWidth = Math.max(window.innerWidth, ${hostViewportWidth});
      document.documentElement.style.setProperty('--autoqa-host-viewport-height', viewportHeight + 'px');
      document.documentElement.style.setProperty('--autoqa-host-viewport-width', viewportWidth + 'px');
      style.textContent = [
        'html { width: 100% !important; min-width: ' + viewportWidth + 'px !important; height: 100% !important; min-height: ' + viewportHeight + 'px !important; margin: 0 !important; overflow: auto !important; }',
        'body { width: 100% !important; min-width: ' + viewportWidth + 'px !important; height: 100% !important; min-height: ' + viewportHeight + 'px !important; margin: 0 !important; overflow: auto !important; }',
        '#root, #__next, #app, .app, [data-reactroot] { width: 100% !important; min-width: ' + viewportWidth + 'px !important; min-height: ' + viewportHeight + 'px !important; }',
        'iframe { height: 100% !important; min-height: ' + viewportHeight + 'px !important; max-height: none !important; }'
      ].join('\\n');
      for (const frame of document.querySelectorAll('iframe')) {
        frame.style.height = '100%';
        frame.style.minHeight = viewportHeight + 'px';
        frame.style.maxHeight = 'none';
      }
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
      window.dispatchEvent(new Event('resize'));
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        window.scrollTo(0, 0);
      });
    })();
  `,
    )
    .catch(() => {});

  await new Promise((resolve) => window.setTimeout(resolve, 150));
  sizeExtractorWebview();
  await resetExtractorScroll();
}

async function rerenderExtractorGuestViewport() {
  await normalizeExtractorGuestViewport();
  if (typeof elements.extractorWebview.executeJavaScript !== "function") return;
  await elements.extractorWebview
    .executeJavaScript(
      `
    (() => {
      const root = document.documentElement;
      const body = document.body;
      if (!root || !body) return;
      root.style.willChange = 'width, height';
      body.style.willChange = 'width, height';
      root.style.visibility = 'hidden';
      void root.offsetWidth;
      root.style.visibility = '';
      window.dispatchEvent(new Event('resize'));
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        root.style.willChange = '';
        body.style.willChange = '';
      });
    })();
  `,
    )
    .catch(() => {});
}

function resetProgress(scenarioTotal = 0) {
  latestProgress = {
    phase: "starting",
    currentTitle: "준비 중",
    completed: 0,
    total: 0,
    percent: 0,
    elapsedMs: 0,
    estimatedTotalMs: 0,
    remainingMs: 0,
    scenarioTotal,
    scenarioPassed: 0,
    scenarioFailed: 0,
  };
  renderProgress(latestProgress);
}

function startProgressTicker() {
  stopProgressTicker();
  progressTimer = window.setInterval(() => {
    if (!activeRunId || !latestProgress || !runStartedAt) return;
    renderProgress({
      ...latestProgress,
      elapsedMs: Date.now() - runStartedAt,
    });
  }, 1000);
}

function stopProgressTicker() {
  if (!progressTimer) return;
  window.clearInterval(progressTimer);
  progressTimer = null;
}

function renderProgress(progress) {
  const percent = Math.max(0, Math.min(progress.percent || 0, 100));
  const elapsedMs = progress.elapsedMs || 0;
  const estimatedTotalMs = estimateTotalMs(progress, elapsedMs);
  elements.progressPhase.textContent =
    progress.currentTitle || progress.phase || "진행 중";
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
  elements.estimatedTime.textContent = formatDuration(estimatedTotalMs);
  elements.elapsedTime.textContent = formatDuration(elapsedMs);
  elements.qaResultBadge.textContent = percent >= 100 ? "done" : "running";
  if (progress.currentTitle && progress.currentTitle !== qaLastProgressTitle) {
    appendQaLog(progress.currentTitle, percent >= 100 ? "success" : "info");
    qaLastProgressTitle = progress.currentTitle;
  }
  if (Number.isFinite(progress.scenarioTotal)) {
    renderRunCounts({
      total: progress.scenarioTotal,
      passed: progress.scenarioPassed || 0,
      failed: progress.scenarioFailed || 0,
    });
    elements.progressPreviewSummary.textContent = `전체 ${progress.scenarioTotal}개 / 통과 ${progress.scenarioPassed || 0} / 실패 ${progress.scenarioFailed || 0}`;
  }
  renderScreenPreview(progress);
  renderQaWorkerCards(progress);
}

function estimateTotalMs(progress, elapsedMs) {
  if (progress.completed > 0 && progress.total > 0) {
    return Math.max(
      elapsedMs,
      Math.round((elapsedMs / progress.completed) * progress.total),
    );
  }
  return progress.estimatedTotalMs || 0;
}

function formatDuration(ms) {
  if (!ms) return "-";
  const seconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}초`;
  return `${minutes}분 ${String(rest).padStart(2, "0")}초`;
}

function renderResults(results) {
  elements.resultList.innerHTML = "";
  if (!results.length) {
    elements.totalCount.textContent = "0";
    elements.passCount.textContent = "0";
    elements.failCount.textContent = "0";
    elements.qaResultBadge.textContent = "idle";
    elements.qaLiveStats.innerHTML = `
      <div><span>전체</span><strong>0</strong></div>
      <div><span>완료</span><strong>0</strong></div>
      <div><span>실패</span><strong>0</strong></div>
    `;
    return;
  }

  for (const result of results) {
    const item = document.createElement("article");
    item.className = "result-item";
    item.innerHTML = `
      <span class="badge ${result.status}">${result.status}</span>
      <strong>${escapeHtml(result.title)}</strong>
      <p>${escapeHtml(result.environmentName || "기본")} · ${escapeHtml(result.featurePath || "공통")} · ${escapeHtml(formatSuiteLabel(result.suite))}</p>
      <p>${Number(result.durationMs || 0)}ms</p>
      ${result.failureReason ? `<p><strong>실패 사유</strong> ${escapeHtml(result.failureReason)}</p>` : ""}
      ${result.detectionPoint ? `<p><strong>발견 지점</strong> ${escapeHtml(result.detectionPoint)}</p>` : ""}
      ${result.error ? `<p>${escapeHtml(result.error)}</p>` : ""}
    `;
    elements.resultList.appendChild(item);
    appendQaLog(`${result.title} ${result.status === "passed" ? "통과" : result.status === "failed" ? "실패" : "완료"}`, result.status === "failed" ? "error" : "success");
  }
  const hasFailure = results.some((item) => item.status === "failed");
  const hasPass = results.some((item) => item.status === "passed");
  elements.qaResultBadge.textContent = hasFailure ? "failed" : hasPass ? "passed" : "done";
}

function syncFailureExportControls(result) {
  const failedCount = Array.isArray(result?.results)
    ? result.results.filter((item) => item?.status === "failed").length
    : 0;
  const hasFailures = failedCount > 0;
  elements.exportFailures.classList.toggle("hidden", !hasFailures);
  elements.failureExportField.classList.toggle("hidden", !hasFailures);
  elements.exportFailures.disabled = !hasFailures;
}

function syncRunVideoControls(result) {
  const videoCount = Array.isArray(result?.reports?.videos)
    ? result.reports.videos.length
    : 0;
  const hasVideos = videoCount > 0;
  elements.qaDownloadVideos.classList.toggle("hidden", !hasVideos);
  elements.qaDownloadVideos.disabled = !hasVideos;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeRunError(message) {
  return String(message || "")
    .replace(/^Error invoking remote method 'qa:run':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim() || "실행 중 오류가 발생했습니다.";
}
