const elements = {
  homePage: document.querySelector("#homePage"),
  scenarioPage: document.querySelector("#scenarioPage"),
  qaPage: document.querySelector("#qaPage"),
  navScenarioPage: document.querySelector("#navScenarioPage"),
  navQaPage: document.querySelector("#navQaPage"),
  homeScenarioCta: document.querySelector("#homeScenarioCta"),
  homeQaCta: document.querySelector("#homeQaCta"),
  scenarioBaseUrl: document.querySelector("#scenarioBaseUrl"),
  qaBaseUrl: document.querySelector("#qaBaseUrl"),
  toggleUrlHistory: document.querySelector("#toggleUrlHistory"),
  urlHistoryMenu: document.querySelector("#urlHistoryMenu"),
  urlHistoryList: document.querySelector("#urlHistoryList"),
  clearUrlHistory: document.querySelector("#clearUrlHistory"),
  workers: document.querySelector("#workers"),
  headless: document.querySelector("#headless"),
  failFast: document.querySelector("#failFast"),
  updateBanner: document.querySelector("#updateBanner"),
  updateBannerTitle: document.querySelector("#updateBannerTitle"),
  updateBannerMessage: document.querySelector("#updateBannerMessage"),
  checkForUpdates: document.querySelector("#checkForUpdates"),
  installUpdate: document.querySelector("#installUpdate"),
  scenarioText: document.querySelector("#scenarioText"),
  qaScenarioText: document.querySelector("#qaScenarioText"),
  scenarioFile: document.querySelector("#scenarioFile"),
  scenarioAccordion: document.querySelector("#scenarioAccordion"),
  toggleScenarioAccordion: document.querySelector("#toggleScenarioAccordion"),
  progressPreview: document.querySelector("#progressPreview"),
  progressPreviewSummary: document.querySelector("#progressPreviewSummary"),
  progressPreviewImage: document.querySelector("#progressPreviewImage"),
  progressPreviewEmpty: document.querySelector("#progressPreviewEmpty"),
  progressPreviewTitle: document.querySelector("#progressPreviewTitle"),
  progressPreviewUrl: document.querySelector("#progressPreviewUrl"),
  guideModal: document.querySelector("#guideModal"),
  openGuide: document.querySelector("#openGuide"),
  closeGuide: document.querySelector("#closeGuide"),
  openScenario: document.querySelector("#openScenario"),
  openScenarioQa: document.querySelector("#openScenarioQa"),
  saveScenario: document.querySelector("#saveScenario"),
  extractScenario: document.querySelector("#extractScenario"),
  extractorShell: document.querySelector("#extractorShell"),
  extractorUrl: document.querySelector("#extractorUrl"),
  extractorWebview: document.querySelector("#extractorWebview"),
  extractorResizeOverlay: document.querySelector("#extractorResizeOverlay"),
  extractorScenarioPreview: document.querySelector("#extractorScenarioPreview"),
  extractorScenarioCount: document.querySelector("#extractorScenarioCount"),
  saveExtractorScenario: document.querySelector("#saveExtractorScenario"),
  extractorRecorderTitle: document.querySelector("#extractorRecorderTitle"),
  extractorRecorderFeature: document.querySelector("#extractorRecorderFeature"),
  extractorRecorderSuite: document.querySelector("#extractorRecorderSuite"),
  extractorRecorderTags: document.querySelector("#extractorRecorderTags"),
  extractorTogglePin: document.querySelector("#extractorTogglePin"),
  extractorAddPath: document.querySelector("#extractorAddPath"),
  extractorUndoStep: document.querySelector("#extractorUndoStep"),
  extractorClearSteps: document.querySelector("#extractorClearSteps"),
  extractorCommitScenario: document.querySelector("#extractorCommitScenario"),
  extractorRecorderSteps: document.querySelector("#extractorRecorderSteps"),
  extractorRecorderCount: document.querySelector("#extractorRecorderCount"),
  closeExtractor: document.querySelector("#closeExtractor"),
  backFromScenario: document.querySelector("#backFromScenario"),
  backFromQa: document.querySelector("#backFromQa"),
  runQa: document.querySelector("#runQa"),
  statusText: document.querySelector("#statusText"),
  progressPhase: document.querySelector("#progressPhase"),
  progressPercent: document.querySelector("#progressPercent"),
  progressFill: document.querySelector("#progressFill"),
  estimatedTime: document.querySelector("#estimatedTime"),
  elapsedTime: document.querySelector("#elapsedTime"),
  cancelQa: document.querySelector("#cancelQa"),
  totalCount: document.querySelector("#totalCount"),
  passCount: document.querySelector("#passCount"),
  failCount: document.querySelector("#failCount"),
  resultList: document.querySelector("#resultList"),
  openReport: document.querySelector("#openReport"),
  historySummary: document.querySelector("#historySummary"),
  historyRunCount: document.querySelector("#historyRunCount"),
  historyPassRate: document.querySelector("#historyPassRate"),
  historyRegressionCount: document.querySelector("#historyRegressionCount"),
  historyRecentRuns: document.querySelector("#historyRecentRuns"),
  historyHotspots: document.querySelector("#historyHotspots"),
};

let latestReportPath = null;
let activeRunId = null;
let runStartedAt = 0;
let progressTimer = null;
let latestProgress = null;
let extractorResizeObserver = null;
let extractorFrameObserver = null;
let extractorViewportSyncTimer = null;
let extractorResizeSettledTimer = null;
let currentPage = "home";
const urlHistoryStorageKey = "autoqa.baseUrlHistory";
const maxUrlHistoryItems = 6;

initializeGuide();
renderUrlHistory();
syncPreviewVisibility();
refreshHistory();
setPage("home");

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
  elements.scenarioFile.textContent = "시나리오 추출 결과가 추가됨";
  renderExtractorScenarioPreview();
});

window.autoqa.onRecorderState((state) => {
  renderExtractorRecorderState(state);
});

window.autoqa.onAppUpdateState((state) => {
  renderAppUpdateState(state);
});

elements.navScenarioPage.addEventListener("click", () => setPage("scenario"));
elements.navQaPage.addEventListener("click", () => setPage("qa"));
elements.homeScenarioCta.addEventListener("click", () => setPage("scenario"));
elements.homeQaCta.addEventListener("click", () => setPage("qa"));
elements.backFromScenario.addEventListener("click", () => setPage("home"));
elements.backFromQa.addEventListener("click", () => setPage("home"));

elements.openScenario.addEventListener("click", openScenarioIntoEditors);
elements.openScenarioQa.addEventListener("click", openScenarioIntoEditors);
elements.saveScenario.addEventListener("click", saveCurrentScenario);
elements.saveExtractorScenario.addEventListener("click", saveCurrentScenario);

elements.toggleUrlHistory.addEventListener("click", () => {
  const isOpen = !elements.urlHistoryMenu.classList.contains("hidden");
  setUrlHistoryOpen(!isOpen);
});

elements.clearUrlHistory.addEventListener("click", () => {
  window.localStorage.removeItem(urlHistoryStorageKey);
  renderUrlHistory();
});

elements.qaBaseUrl.addEventListener("focus", () => {
  if (loadUrlHistory().length) setUrlHistoryOpen(true);
});

elements.scenarioBaseUrl.addEventListener("input", () => {
  elements.qaBaseUrl.value = elements.scenarioBaseUrl.value;
});

elements.qaBaseUrl.addEventListener("input", () => {
  elements.scenarioBaseUrl.value = elements.qaBaseUrl.value;
});

elements.headless.addEventListener("change", syncPreviewVisibility);

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
});

elements.openGuide.addEventListener("click", () => setGuideOpen(true));
elements.closeGuide.addEventListener("click", dismissGuide);
elements.guideModal.addEventListener("click", (event) => {
  if (event.target === elements.guideModal) dismissGuide();
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".url-field")) return;
  setUrlHistoryOpen(false);
});

elements.toggleScenarioAccordion.addEventListener("click", () => {
  setScenarioAccordionOpen(
    !elements.scenarioAccordion.classList.contains("open"),
  );
});

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

elements.extractScenario.addEventListener("click", async () => {
  const config = await window.autoqa.openScenarioExtractor({
    baseUrl: elements.scenarioBaseUrl.value,
  });
  openEmbeddedExtractor(config);
});

elements.closeExtractor.addEventListener("click", closeEmbeddedExtractor);

elements.runQa.addEventListener("click", async () => {
  activeRunId = `run-${Date.now()}`;
  runStartedAt = Date.now();
  const scenarioTotal = countScenarioRunsFallback(
    elements.qaScenarioText.value,
  );
  const previewEnabled = elements.headless.checked;
  setRunning(true);
  renderResults([]);
  renderRunCounts({ total: scenarioTotal, passed: 0, failed: 0 });
  resetScreenPreview(scenarioTotal, previewEnabled);
  resetProgress(scenarioTotal);
  startProgressTicker();
  latestReportPath = null;
  elements.openReport.classList.add("hidden");

  try {
    saveBaseUrlHistory(elements.qaBaseUrl.value);
    const result = await window.autoqa.run({
      runId: activeRunId,
      baseUrl: elements.qaBaseUrl.value,
      scenarioText: elements.qaScenarioText.value,
      workers: Number(elements.workers.value) || 1,
      headless: elements.headless.checked,
      failFast: elements.failFast.checked,
    });

    elements.statusText.textContent = "완료";
    renderRunCounts({
      total: result.summary.scenarioTotal ?? result.summary.total,
      passed: result.summary.scenarioPassed ?? result.summary.passed,
      failed: result.summary.scenarioFailed ?? result.summary.failed,
    });
    renderResults(result.results);
    latestReportPath = result.reports.htmlPath;
    elements.openReport.classList.remove("hidden");
    refreshHistory();
  } catch (error) {
    const cancelled = error.message.includes("취소");
    elements.statusText.textContent = cancelled ? "취소됨" : "실패";
    renderResults([
      {
        title: cancelled
          ? "QA 실행이 취소되었습니다"
          : "실행을 완료하지 못했습니다",
        status: cancelled ? "skipped" : "failed",
        error: error.message,
        durationMs: 0,
      },
    ]);
  } finally {
    stopProgressTicker();
    setRunning(false);
    activeRunId = null;
    runStartedAt = 0;
  }
});

elements.cancelQa.addEventListener("click", async () => {
  if (!activeRunId) return;
  elements.cancelQa.disabled = true;
  elements.progressPhase.textContent = "취소 중";
  await window.autoqa.cancel(activeRunId);
});

elements.openReport.addEventListener("click", async () => {
  if (latestReportPath) await window.autoqa.openReport(latestReportPath);
});

function setPage(page) {
  currentPage = page;
  const pages = {
    home: elements.homePage,
    scenario: elements.scenarioPage,
    qa: elements.qaPage,
  };

  Object.entries(pages).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== page);
  });

  elements.navScenarioPage.classList.toggle("active", page === "scenario");
  elements.navQaPage.classList.toggle("active", page === "qa");
}

function syncScenarioEditors(source, target) {
  if (target.value === source.value) return;
  target.value = source.value;
}

function setSharedScenarioText(value) {
  elements.scenarioText.value = value;
  elements.qaScenarioText.value = value;
}

async function openScenarioIntoEditors() {
  const file = await window.autoqa.openScenario();
  if (!file) return;
  setSharedScenarioText(file.content);
  elements.scenarioFile.textContent = file.filePath;
  renderExtractorScenarioPreview();
}

function setRunning(isRunning) {
  elements.runQa.disabled = isRunning;
  elements.openScenarioQa.disabled = isRunning;
  elements.extractScenario.disabled = isRunning;
  elements.cancelQa.disabled = false;
  elements.cancelQa.classList.toggle("hidden", !isRunning);
  elements.statusText.textContent = isRunning
    ? "실행 중"
    : elements.statusText.textContent;
}

function openEmbeddedExtractor(config) {
  if (!config?.targetUrl || !config?.preloadUrl) return;
  elements.extractorUrl.textContent = config.targetUrl;
  seedExtractorMetadata(config.targetUrl);
  renderExtractorScenarioPreview();
  renderExtractorRecorderState();
  elements.extractorWebview.setAttribute("preload", config.preloadUrl);
  elements.extractorWebview.removeAttribute("src");
  elements.extractorShell.classList.remove("hidden");
  document.body.classList.add("extractor-open");
  setExtractorResizeLoading(false);
  startExtractorSizing();
  window.addEventListener("resize", handleExtractorWindowResize);
  elements.extractorWebview.addEventListener(
    "dom-ready",
    () => {
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
    },
    { once: true },
  );
  elements.extractorWebview.setAttribute("src", config.targetUrl);
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

function closeEmbeddedExtractor() {
  elements.extractorWebview.removeAttribute("src");
  elements.extractorShell.classList.add("hidden");
  document.body.classList.remove("extractor-open");
  window.removeEventListener("resize", handleExtractorWindowResize);
  setExtractorResizeLoading(false);
  stopExtractorSizing();
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

function initializeGuide() {
  const guideSeen = window.localStorage.getItem("autoqa.guideSeen");
  if (!guideSeen) {
    window.requestAnimationFrame(() => setGuideOpen(true));
  }
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

function setUrlHistoryOpen(isOpen) {
  elements.urlHistoryMenu.classList.toggle("hidden", !isOpen);
}

function renderUrlHistory() {
  const items = loadUrlHistory();
  if (!items.length) {
    elements.urlHistoryList.innerHTML = `
      <div class="url-history-empty">아직 저장된 URL 기록이 없습니다. 한 번 실행하면 다음부터 여기서 빠르게 다시 시작할 수 있습니다.</div>
    `;
    elements.clearUrlHistory.disabled = true;
    return;
  }

  elements.clearUrlHistory.disabled = false;
  elements.urlHistoryList.innerHTML = items
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

  elements.urlHistoryList
    .querySelectorAll("[data-history-index]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const selected = items[Number(button.dataset.historyIndex)];
        if (!selected?.url) return;
        elements.qaBaseUrl.value = selected.url;
        elements.scenarioBaseUrl.value = selected.url;
        setUrlHistoryOpen(false);
        elements.qaBaseUrl.focus();
      });
    });
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

function setGuideOpen(isOpen) {
  elements.guideModal.classList.toggle("hidden", !isOpen);
}

function dismissGuide() {
  window.localStorage.setItem("autoqa.guideSeen", "true");
  setGuideOpen(false);
}

function setScenarioAccordionOpen(isOpen) {
  elements.scenarioAccordion.classList.toggle("open", isOpen);
  elements.toggleScenarioAccordion.textContent = isOpen ? "접기" : "펼치기";
}

function syncPreviewVisibility() {
  elements.progressPreview.classList.toggle(
    "hidden",
    !elements.headless.checked,
  );
}

function resetScreenPreview(scenarioTotal = 0, previewEnabled = true) {
  elements.progressPreview.classList.toggle("hidden", !previewEnabled);
  elements.progressPreviewSummary.textContent = `전체 ${scenarioTotal}개 / 통과 0 / 실패 0`;
  elements.progressPreviewImage.removeAttribute("src");
  elements.progressPreviewImage.classList.remove("visible");
  elements.progressPreviewEmpty.classList.remove("hidden");
  elements.progressPreviewTitle.textContent = "QA 실행 준비";
  elements.progressPreviewUrl.textContent = "-";
}

function renderScreenPreview(progress) {
  if (!elements.headless.checked) return;
  if (!progress.previewImage) return;
  elements.progressPreview.classList.remove("hidden");
  elements.progressPreviewImage.src = progress.previewImage;
  elements.progressPreviewImage.classList.add("visible");
  elements.progressPreviewEmpty.classList.add("hidden");
  elements.progressPreviewTitle.textContent =
    progress.currentTitle || "테스트 화면 업데이트";
  elements.progressPreviewUrl.textContent = progress.previewUrl || "-";
}

async function saveCurrentScenario() {
  const content = elements.scenarioText.value.trim();
  if (!content) {
    elements.scenarioFile.textContent = "저장할 시나리오가 없습니다";
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
    elements.scenarioFile.textContent = result.filePath;
    renderExtractorScenarioPreview();
  } catch (error) {
    elements.scenarioFile.textContent = error.message || "시나리오 저장 실패";
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

  if (typeof MutationObserver !== "undefined") {
    extractorFrameObserver = new MutationObserver(runExtractorViewportRender);
    extractorFrameObserver.observe(elements.extractorWebview, {
      childList: true,
      subtree: true,
    });
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
  sizeExtractorWebview();
  if (extractorViewportSyncTimer) {
    window.clearTimeout(extractorViewportSyncTimer);
  }
  extractorViewportSyncTimer = window.setTimeout(() => {
    rerenderExtractorGuestViewport();
  }, 40);
}

function handleExtractorWindowResize() {
  if (elements.extractorShell.classList.contains("hidden")) return;

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
  if (Number.isFinite(progress.scenarioTotal)) {
    renderRunCounts({
      total: progress.scenarioTotal,
      passed: progress.scenarioPassed || 0,
      failed: progress.scenarioFailed || 0,
    });
    elements.progressPreviewSummary.textContent = `전체 ${progress.scenarioTotal}개 / 통과 ${progress.scenarioPassed || 0} / 실패 ${progress.scenarioFailed || 0}`;
  }
  renderScreenPreview(progress);
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
      ${result.error ? `<p>${escapeHtml(result.error)}</p>` : ""}
    `;
    elements.resultList.appendChild(item);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
