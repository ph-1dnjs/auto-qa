const elements = {
  baseUrl: document.querySelector("#baseUrl"),
  workers: document.querySelector("#workers"),
  headless: document.querySelector("#headless"),
  failFast: document.querySelector("#failFast"),
  scenarioText: document.querySelector("#scenarioText"),
  scenarioFile: document.querySelector("#scenarioFile"),
  openScenario: document.querySelector("#openScenario"),
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
  openReport: document.querySelector("#openReport")
};

let latestReportPath = null;
let activeRunId = null;
let runStartedAt = 0;
let progressTimer = null;
let latestProgress = null;

window.autoqa.onProgress((progress) => {
  if (progress.runId !== activeRunId) return;
  latestProgress = progress;
  renderProgress(progress);
});

elements.openScenario.addEventListener("click", async () => {
  const file = await window.autoqa.openScenario();
  if (!file) return;
  elements.scenarioText.value = file.content;
  elements.scenarioFile.textContent = file.filePath;
});

elements.runQa.addEventListener("click", async () => {
  activeRunId = `run-${Date.now()}`;
  runStartedAt = Date.now();
  setRunning(true);
  renderResults([]);
  resetProgress();
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
      failFast: elements.failFast.checked
    });

    elements.statusText.textContent = "완료";
    elements.totalCount.textContent = result.summary.total;
    elements.passCount.textContent = result.summary.passed;
    elements.failCount.textContent = result.summary.failed;
    renderResults(result.results);
    latestReportPath = result.reports.htmlPath;
    elements.openReport.classList.remove("hidden");
  } catch (error) {
    const cancelled = error.message.includes("취소");
    elements.statusText.textContent = cancelled ? "취소됨" : "실패";
    renderResults([
      {
        title: cancelled ? "QA 실행이 취소되었습니다" : "실행을 완료하지 못했습니다",
        status: cancelled ? "skipped" : "failed",
        error: error.message,
        durationMs: 0
      }
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
  elements.cancelQa.disabled = false;
  elements.cancelQa.classList.toggle("hidden", !isRunning);
  elements.statusText.textContent = isRunning ? "실행 중" : elements.statusText.textContent;
}

function resetProgress() {
  latestProgress = {
    phase: "starting",
    currentTitle: "준비 중",
    completed: 0,
    total: 0,
    percent: 0,
    elapsedMs: 0,
    estimatedTotalMs: 0,
    remainingMs: 0
  };
  renderProgress(latestProgress);
}

function startProgressTicker() {
  stopProgressTicker();
  progressTimer = window.setInterval(() => {
    if (!activeRunId || !latestProgress || !runStartedAt) return;
    renderProgress({
      ...latestProgress,
      elapsedMs: Date.now() - runStartedAt
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
  elements.progressPhase.textContent = progress.currentTitle || progress.phase || "진행 중";
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
  elements.estimatedTime.textContent = formatDuration(estimatedTotalMs);
  elements.elapsedTime.textContent = formatDuration(elapsedMs);
}

function estimateTotalMs(progress, elapsedMs) {
  if (progress.completed > 0 && progress.total > 0) {
    return Math.max(elapsedMs, Math.round((elapsedMs / progress.completed) * progress.total));
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
