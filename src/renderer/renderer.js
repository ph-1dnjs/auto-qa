const elements = {
  baseUrl: document.querySelector("#baseUrl"),
  workers: document.querySelector("#workers"),
  headless: document.querySelector("#headless"),
  failFast: document.querySelector("#failFast"),
  updateBanner: document.querySelector("#updateBanner"),
  updateBannerTitle: document.querySelector("#updateBannerTitle"),
  updateBannerMessage: document.querySelector("#updateBannerMessage"),
  checkForUpdates: document.querySelector("#checkForUpdates"),
  installUpdate: document.querySelector("#installUpdate"),
  scenarioText: document.querySelector("#scenarioText"),
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
  saveScenario: document.querySelector("#saveScenario"),
  extractScenario: document.querySelector("#extractScenario"),
  extractorShell: document.querySelector("#extractorShell"),
  extractorUrl: document.querySelector("#extractorUrl"),
  extractorWebview: document.querySelector("#extractorWebview"),
  extractorScenarioPreview: document.querySelector("#extractorScenarioPreview"),
  extractorScenarioCount: document.querySelector("#extractorScenarioCount"),
  saveExtractorScenario: document.querySelector("#saveExtractorScenario"),
  extractorRecorderTitle: document.querySelector("#extractorRecorderTitle"),
  extractorTogglePin: document.querySelector("#extractorTogglePin"),
  extractorAddPath: document.querySelector("#extractorAddPath"),
  extractorUndoStep: document.querySelector("#extractorUndoStep"),
  extractorClearSteps: document.querySelector("#extractorClearSteps"),
  extractorCommitScenario: document.querySelector("#extractorCommitScenario"),
  extractorRecorderSteps: document.querySelector("#extractorRecorderSteps"),
  extractorRecorderCount: document.querySelector("#extractorRecorderCount"),
  closeExtractor: document.querySelector("#closeExtractor"),
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
};

let latestReportPath = null;
let activeRunId = null;
let runStartedAt = 0;
let progressTimer = null;
let latestProgress = null;
let extractorResizeObserver = null;
let extractorFrameObserver = null;

initializeGuide();

window.autoqa.onProgress((progress) => {
  if (progress.runId !== activeRunId) return;
  latestProgress = progress;
  renderProgress(progress);
});

window.autoqa.onScenarioExtracted((payload) => {
  if (!payload?.markdown) return;
  const current = elements.scenarioText.value.trim();
  elements.scenarioText.value = current
    ? `${current}\n\n${payload.markdown.trim()}\n`
    : `${payload.markdown.trim()}\n`;
  elements.scenarioFile.textContent = "시나리오 추출 결과가 추가됨";
  renderExtractorScenarioPreview();
});

window.autoqa.onRecorderState((state) => {
  renderExtractorRecorderState(state);
});

window.autoqa.onAppUpdateState((state) => {
  renderAppUpdateState(state);
});

elements.openScenario.addEventListener("click", async () => {
  const file = await window.autoqa.openScenario();
  if (!file) return;
  elements.scenarioText.value = file.content;
  elements.scenarioFile.textContent = file.filePath;
  renderExtractorScenarioPreview();
});

elements.saveScenario.addEventListener("click", saveCurrentScenario);
elements.saveExtractorScenario.addEventListener("click", saveCurrentScenario);
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

elements.scenarioText.addEventListener("input", renderExtractorScenarioPreview);

elements.openGuide.addEventListener("click", () => {
  setGuideOpen(true);
});

elements.closeGuide.addEventListener("click", () => {
  dismissGuide();
});

elements.guideModal.addEventListener("click", (event) => {
  if (event.target === elements.guideModal) dismissGuide();
});

elements.toggleScenarioAccordion.addEventListener("click", () => {
  setScenarioAccordionOpen(!elements.scenarioAccordion.classList.contains("open"));
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
  });
});

elements.extractScenario.addEventListener("click", async () => {
  const config = await window.autoqa.openScenarioExtractor({
    baseUrl: elements.baseUrl.value,
  });
  openEmbeddedExtractor(config);
});

elements.closeExtractor.addEventListener("click", () => {
  closeEmbeddedExtractor();
});

elements.runQa.addEventListener("click", async () => {
  activeRunId = `run-${Date.now()}`;
  runStartedAt = Date.now();
  const scenarioTotal = countScenarioRuns(elements.scenarioText.value);
  setRunning(true);
  setScenarioAccordionOpen(false);
  renderResults([]);
  renderRunCounts({ total: scenarioTotal, passed: 0, failed: 0 });
  resetScreenPreview(scenarioTotal);
  resetProgress(scenarioTotal);
  startProgressTicker();
  latestReportPath = null;
  elements.openReport.classList.add("hidden");

  try {
    const result = await window.autoqa.run({
      runId: activeRunId,
      baseUrl: elements.baseUrl.value,
      scenarioText: elements.scenarioText.value,
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

function setRunning(isRunning) {
  elements.runQa.disabled = isRunning;
  elements.openScenario.disabled = isRunning;
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
  renderExtractorScenarioPreview();
  renderExtractorRecorderState();
  elements.extractorWebview.setAttribute("preload", config.preloadUrl);
  elements.extractorWebview.removeAttribute("src");
  elements.extractorShell.classList.remove("hidden");
  document.body.classList.add("extractor-open");
  startExtractorSizing();
  window.addEventListener("resize", sizeExtractorWebview);
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

function closeEmbeddedExtractor() {
  elements.extractorWebview.removeAttribute("src");
  elements.extractorShell.classList.add("hidden");
  document.body.classList.remove("extractor-open");
  window.removeEventListener("resize", sizeExtractorWebview);
  stopExtractorSizing();
}

function renderExtractorScenarioPreview() {
  const scenario = elements.scenarioText.value.trim();
  const lineCount = scenario ? scenario.split(/\r\n|\r|\n/).length : 0;
  elements.extractorScenarioPreview.textContent =
    scenario || "현재 작성된 시나리오가 없습니다.";
  elements.extractorScenarioCount.textContent = `${lineCount}줄`;
}

function countScenarioRuns(input) {
  const text = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!text) return 1;

  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : parsed.scenarios || [];
      return Math.max(1, items.length);
    } catch {
      return 1;
    }
  }

  const blocks = text
    .split(/\n(?=#{1,3}\s*시나리오:|\n?Scenario:|\n?시나리오:)/i)
    .map((block) => block.trim())
    .filter(Boolean);
  return Math.max(1, blocks.length);
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
  elements.updateBannerTitle.textContent = titleByType[state.type] || "업데이트";
  elements.updateBannerMessage.textContent =
    state.message || "업데이트 정보를 불러오는 중입니다.";
  elements.installUpdate.classList.toggle("hidden", state.type !== "downloaded");
  elements.installUpdate.disabled = false;
}

function initializeGuide() {
  const guideSeen = window.localStorage.getItem("autoqa.guideSeen");
  if (!guideSeen) {
    window.requestAnimationFrame(() => {
      setGuideOpen(true);
    });
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

function resetScreenPreview(scenarioTotal = 0) {
  elements.progressPreview.classList.remove("hidden");
  elements.progressPreviewSummary.textContent = `전체 ${scenarioTotal}개 / 통과 0 / 실패 0`;
  elements.progressPreviewImage.removeAttribute("src");
  elements.progressPreviewImage.classList.remove("visible");
  elements.progressPreviewEmpty.classList.remove("hidden");
  elements.progressPreviewTitle.textContent = "QA 실행 준비";
  elements.progressPreviewUrl.textContent = "-";
}

function renderScreenPreview(progress) {
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
  const match = content.match(/^(?:#{1,3}\s*)?(?:시나리오|Scenario)\s*:\s*(.+)$/im);
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
  sizeExtractorWebview();
  window.requestAnimationFrame(() => {
    sizeExtractorWebview();
    window.requestAnimationFrame(sizeExtractorWebview);
  });

  if (typeof ResizeObserver !== "undefined") {
    extractorResizeObserver = new ResizeObserver(sizeExtractorWebview);
    extractorResizeObserver.observe(elements.extractorShell);
  }

  if (typeof MutationObserver !== "undefined") {
    extractorFrameObserver = new MutationObserver(sizeExtractorWebview);
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
  const width = webviewRect.width || contentRect?.width || elements.extractorShell.clientWidth;
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
  const { height: hostViewportHeight } = getExtractorWebviewSize();
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
      document.documentElement.style.setProperty('--autoqa-host-viewport-height', viewportHeight + 'px');
      style.textContent = [
        'html { height: 100% !important; min-height: ' + viewportHeight + 'px !important; margin: 0 !important; overflow: auto !important; }',
        'body { height: 100% !important; min-height: ' + viewportHeight + 'px !important; margin: 0 !important; overflow: auto !important; }',
        '#root, #__next, #app, .app, [data-reactroot] { min-height: ' + viewportHeight + 'px !important; }',
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

      return {
        innerHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
        devicePixelRatio: window.devicePixelRatio
      };
    })();
  `,
    )
    .catch(() => {});

  await new Promise((resolve) => window.setTimeout(resolve, 150));
  sizeExtractorWebview();
  await resetExtractorScroll();
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
    elements.progressPreviewSummary.textContent =
      `전체 ${progress.scenarioTotal}개 / 통과 ${progress.scenarioPassed || 0} / 실패 ${progress.scenarioFailed || 0}`;
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
