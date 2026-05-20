document.body.dataset.platform = navigator.userAgent.includes("Mac") ? "mac" : "default";

const elements = {
  homePage: document.querySelector("#homePage"),
  scenarioPage: document.querySelector("#scenarioPage"),
  flowPage: document.querySelector("#flowPage"),
  qaPage: document.querySelector("#qaPage"),
  homeBrand: document.querySelector("#homeBrand"),
  navScenarioPage: document.querySelector("#navScenarioPage"),
  navFlowPage: document.querySelector("#navFlowPage"),
  navQaPage: document.querySelector("#navQaPage"),
  homeScenarioCta: document.querySelector("#homeScenarioCta"),
  homeQaCta: document.querySelector("#homeQaCta"),
  scenarioBaseUrl: document.querySelector("#scenarioBaseUrl"),
  qaBaseUrl: document.querySelector("#qaBaseUrl"),
  toggleScenarioUrlHistory: document.querySelector("#toggleScenarioUrlHistory"),
  scenarioUrlHistoryMenu: document.querySelector("#scenarioUrlHistoryMenu"),
  scenarioUrlHistoryList: document.querySelector("#scenarioUrlHistoryList"),
  clearScenarioUrlHistory: document.querySelector("#clearScenarioUrlHistory"),
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
  buildFlowFromScenario: document.querySelector("#buildFlowFromScenario"),
  generateScenarioFromFlow: document.querySelector("#generateScenarioFromFlow"),
  flowShapeType: document.querySelector("#flowShapeType"),
  flowShapeCards: Array.from(document.querySelectorAll("[data-flow-shape-card]")),
  addFlowNode: document.querySelector("#addFlowNode"),
  toggleConnectMode: document.querySelector("#toggleConnectMode"),
  deleteFlowSelection: document.querySelector("#deleteFlowSelection"),
  clearFlowChart: document.querySelector("#clearFlowChart"),
  flowColorPalette: document.querySelector("#flowColorPalette"),
  flowColorSwatches: Array.from(document.querySelectorAll(".flow-color-swatch[data-flow-color]")),
  flowCustomColor: document.querySelector("#flowCustomColor"),
  applyFlowColor: document.querySelector("#applyFlowColor"),
  flowPropertiesPanel: document.querySelector("#flowPropertiesPanel"),
  closeFlowDrawer: document.querySelector("#closeFlowDrawer"),
  flowNodeLabelInput: document.querySelector("#flowNodeLabelInput"),
  flowNodeTypeSelect: document.querySelector("#flowNodeTypeSelect"),
  flowGuideTitle: document.querySelector("#flowGuideTitle"),
  flowGuideDescription: document.querySelector("#flowGuideDescription"),
  flowSelectionStatus: document.querySelector("#flowSelectionStatus"),
  flowConnectStatus: document.querySelector("#flowConnectStatus"),
  zoomOutFlow: document.querySelector("#zoomOutFlow"),
  zoomInFlow: document.querySelector("#zoomInFlow"),
  resetFlowZoom: document.querySelector("#resetFlowZoom"),
  flowZoomLabel: document.querySelector("#flowZoomLabel"),
  flowCanvasViewport: document.querySelector("#flowCanvasViewport"),
  flowCanvas: document.querySelector("#flowCanvas"),
  flowEdgeLayer: document.querySelector("#flowEdgeLayer"),
  flowNodeLayer: document.querySelector("#flowNodeLayer"),
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
  toggleExtractorSidebar: document.querySelector("#toggleExtractorSidebar"),
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
  seasonChips: Array.from(document.querySelectorAll(".season-chip[data-season]")),
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
let extractorSidebarOpen = false;
let currentPage = "home";
const urlHistoryStorageKey = "autoqa.baseUrlHistory";
const maxUrlHistoryItems = 6;
const themeStorageKey = "autoqa.selectedSeason";
const seasonThemeMap = { spring: true, summer: true, autumn: true, winter: true };
const flowGuides = {
  start: {
    title: "시작 도형",
    description: "사용자 여정이나 테스트 흐름이 시작되는 지점을 표시합니다. 예: 로그인 페이지 진입.",
  },
  process: {
    title: "프로세스 도형",
    description: "사용자가 수행하거나 시스템이 처리하는 실제 행동을 적습니다. 예: 이메일 입력, 저장 버튼 클릭.",
  },
  decision: {
    title: "판단 도형",
    description: "성공/실패, 예/아니오처럼 갈림길이 생길 때 사용합니다. 연결선 순서대로 예, 아니오가 붙습니다.",
  },
  end: {
    title: "종료 도형",
    description: "테스트 시나리오가 끝나는 지점을 나타냅니다. 예: 대시보드 진입 완료.",
  },
  input: {
    title: "입력 / 출력 도형",
    description: "사용자 입력이나 시스템 출력, API 응답처럼 데이터가 드나드는 지점을 표현합니다.",
  },
  document: {
    title: "문서 도형",
    description: "리포트, 이메일, 영수증, 다운로드 파일처럼 문서 단위를 다룰 때 사용합니다.",
  },
  manualInput: {
    title: "수동 입력 도형",
    description: "사람이 직접 값을 입력해야 하는 단계에 적합합니다. 예: OTP 입력, 고객 정보 기입.",
  },
  predefinedProcess: {
    title: "사전정의 프로세스 도형",
    description: "다른 곳에서 이미 정의된 하위 시나리오나 공통 모듈을 호출할 때 사용합니다.",
  },
  database: {
    title: "데이터베이스 도형",
    description: "데이터 저장, 조회, 캐시 적재처럼 저장소와의 상호작용을 표현합니다.",
  },
  preparation: {
    title: "준비 도형",
    description: "본격적인 행동 전에 필요한 세팅, 초기화, 조건 맞춤 단계를 표시합니다.",
  },
};
const flowShapeTemplates = {
  start: { width: 220, height: 88, label: "시작", defaultColor: "#2fbf89" },
  end: { width: 220, height: 88, label: "종료", defaultColor: "#2fbf89" },
  process: { width: 240, height: 104, label: "When 동작을 입력", defaultColor: "#2f6fe4" },
  decision: { width: 180, height: 180, label: "조건 확인", defaultColor: "#5a43c3" },
  input: { width: 240, height: 104, label: "입력 / 출력", defaultColor: "#c38b1f" },
  document: { width: 240, height: 112, label: "문서 처리", defaultColor: "#8e98ac" },
  manualInput: { width: 240, height: 104, label: "수동 입력", defaultColor: "#5e55d8" },
  predefinedProcess: { width: 248, height: 104, label: "공통 프로세스", defaultColor: "#34767f" },
  database: { width: 220, height: 120, label: "데이터 저장", defaultColor: "#2b7a61" },
  preparation: { width: 220, height: 104, label: "준비 단계", defaultColor: "#2f8f5e" },
};
const flowBuilder = {
  gridSize: 24,
  width: 1680,
  height: 960,
  tool: "process",
  connectMode: false,
  connectSource: null,
  selectedNodeId: null,
  nodes: [],
  edges: [],
  nextNodeId: 1,
  nextEdgeId: 1,
  zoom: 1,
  selectedColor: "#3393ea",
};
let flowDragState = null;

initializeGuide();
renderUrlHistory();
syncPreviewVisibility();
refreshHistory();
initializeSeasonTheme();
initializeFlowBuilder();
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
elements.navFlowPage.addEventListener("click", () => setPage("flow"));
elements.navQaPage.addEventListener("click", () => setPage("qa"));
elements.homeBrand.addEventListener("click", () => setPage("home"));
elements.homeScenarioCta.addEventListener("click", () => setPage("scenario"));
elements.homeQaCta.addEventListener("click", () => setPage("qa"));
elements.seasonChips.forEach((button) => {
  button.addEventListener("click", () => {
    applySeasonTheme(button.dataset.season);
  });
});

elements.openScenario.addEventListener("click", openScenarioIntoEditors);
elements.openScenarioQa.addEventListener("click", openScenarioIntoEditors);
elements.saveScenario.addEventListener("click", saveCurrentScenario);
elements.saveExtractorScenario.addEventListener("click", saveCurrentScenario);

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
  setUrlHistoryOpen(false, "all");
});

elements.toggleScenarioAccordion.addEventListener("click", () => {
  setScenarioAccordionOpen(
    !elements.scenarioAccordion.classList.contains("open"),
  );
});
elements.flowShapeType.addEventListener("change", () => {
  setFlowTool(elements.flowShapeType.value);
});
elements.flowShapeCards.forEach((button) => {
  button.addEventListener("click", () => {
    setFlowTool(button.dataset.flowShapeCard);
  });
});
elements.addFlowNode.addEventListener("click", () => {
  addFlowNodeAtViewportCenter();
});
elements.toggleConnectMode.addEventListener("click", () => {
  toggleFlowConnectMode();
});
elements.deleteFlowSelection.addEventListener("click", () => {
  deleteSelectedFlowNode();
});
elements.closeFlowDrawer.addEventListener("click", () => {
  flowBuilder.selectedNodeId = null;
  renderFlowBuilder();
});
elements.clearFlowChart.addEventListener("click", () => {
  resetFlowBuilder();
});
elements.flowColorSwatches.forEach((button) => {
  button.addEventListener("click", () => {
    selectFlowColor(button.dataset.flowColor);
  });
});
elements.flowCustomColor.addEventListener("input", () => {
  selectFlowColor(elements.flowCustomColor.value, false);
});
elements.applyFlowColor.addEventListener("click", () => {
  applySelectedFlowColor();
});
elements.flowNodeLabelInput.addEventListener("input", () => {
  updateSelectedFlowNodeLabel(elements.flowNodeLabelInput.value);
});
elements.flowNodeTypeSelect.addEventListener("change", () => {
  updateSelectedFlowNodeType(elements.flowNodeTypeSelect.value);
});
elements.zoomOutFlow.addEventListener("click", () => {
  setFlowZoom(flowBuilder.zoom - 0.1);
});
elements.zoomInFlow.addEventListener("click", () => {
  setFlowZoom(flowBuilder.zoom + 0.1);
});
elements.resetFlowZoom.addEventListener("click", () => {
  setFlowZoom(1);
});
elements.buildFlowFromScenario.addEventListener("click", () => {
  buildFlowChartFromScenarioText(elements.scenarioText.value);
});
elements.generateScenarioFromFlow.addEventListener("click", () => {
  const generated = generateScenarioFromFlowChart();
  if (!generated) return;
  setSharedScenarioText(generated);
  renderExtractorScenarioPreview();
  elements.scenarioFile.textContent = "Flow Chart에서 시나리오를 생성했습니다.";
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
elements.toggleExtractorSidebar.addEventListener("click", () => {
  toggleExtractorSidebar();
});

elements.extractScenario.addEventListener("click", async () => {
  const config = await window.autoqa.openScenarioExtractor({
    baseUrl: elements.scenarioBaseUrl.value,
  });
  openEmbeddedExtractor(config);
});

elements.closeExtractor.addEventListener("click", closeEmbeddedExtractor);
elements.extractorShell.addEventListener("click", (event) => {
  if (!isExtractorCompactLayout() || !extractorSidebarOpen) return;
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
    flow: elements.flowPage,
    qa: elements.qaPage,
  };

  Object.entries(pages).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== page);
  });

  elements.navScenarioPage.classList.toggle("active", page === "scenario");
  elements.navFlowPage.classList.toggle("active", page === "flow");
  elements.navQaPage.classList.toggle("active", page === "qa");
}

function initializeSeasonTheme() {
  const savedSeason = window.localStorage.getItem(themeStorageKey) || "spring";
  applySeasonTheme(savedSeason);
}

function initializeFlowBuilder() {
  renderFlowGuide();
  selectFlowColor(flowBuilder.selectedColor);
  setFlowTool(elements.flowShapeType.value || "process");
  renderFlowBuilder();
  elements.flowNodeLayer.addEventListener("pointerdown", handleFlowNodePointerDown);
  elements.flowNodeLayer.addEventListener("dblclick", handleFlowNodeDoubleClick);
  elements.flowCanvasViewport.addEventListener("pointerdown", handleFlowCanvasPointerDown);
  elements.flowEdgeLayer.addEventListener("click", handleFlowEdgeClick);
  elements.flowEdgeLayer.addEventListener("dblclick", handleFlowEdgeDoubleClick);
  window.addEventListener("pointermove", handleFlowPointerMove);
  window.addEventListener("pointerup", stopFlowDrag);
}

function applySeasonTheme(season) {
  const nextSeason = seasonThemeMap[season] ? season : "spring";
  document.body.dataset.season = nextSeason;
  window.localStorage.setItem(themeStorageKey, nextSeason);
  elements.seasonChips.forEach((button) => {
    button.classList.toggle("active", button.dataset.season === nextSeason);
  });
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

function toggleFlowConnectMode(forceValue) {
  flowBuilder.connectMode = typeof forceValue === "boolean"
    ? forceValue
    : !flowBuilder.connectMode;
  if (!flowBuilder.connectMode) flowBuilder.connectSource = null;
  elements.toggleConnectMode.classList.toggle("active", flowBuilder.connectMode);
  updateFlowStatus();
  renderFlowBuilder();
}

function resetFlowBuilder() {
  flowBuilder.nodes = [];
  flowBuilder.edges = [];
  flowBuilder.selectedNodeId = null;
  flowBuilder.connectSource = null;
  flowBuilder.nextNodeId = 1;
  flowBuilder.nextEdgeId = 1;
  toggleFlowConnectMode(false);
  renderFlowBuilder();
}

function createFlowNode(type, x, y, label = "") {
  const template = flowShapeTemplates[type] || flowShapeTemplates.process;
  return {
    id: `flow-node-${flowBuilder.nextNodeId++}`,
    type,
    x,
    y,
    width: template.width,
    height: template.height,
    label: label || template.label,
    fill: template.defaultColor,
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
      const selectedClass = node.id === flowBuilder.selectedNodeId ? " selected" : "";
      const connectClass = flowBuilder.connectSource?.nodeId === node.id ? " connect-source" : "";
      const nodeLabel = escapeHtml(node.label);
      const ports = renderFlowPorts(node);
      if (node.type === "decision") {
        return `
          <div class="flow-node flow-node-${node.type}${selectedClass}${connectClass}" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--node-fill:${escapeHtml(node.fill)};--node-fill-rgb:${hexToRgb(node.fill)};">
            <button class="flow-node-body" type="button" data-node-id="${node.id}">
              <span class="flow-node-diamond"><span>${nodeLabel}</span></span>
            </button>
            ${ports}
          </div>
        `;
      }
      return `
        <div class="flow-node flow-node-${node.type}${selectedClass}${connectClass}" data-node-id="${node.id}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--node-fill:${escapeHtml(node.fill)};--node-fill-rgb:${hexToRgb(node.fill)};">
          <button class="flow-node-body" type="button" data-node-id="${node.id}">
            <span>${nodeLabel}</span>
          </button>
          ${ports}
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
    edgeMarkup.push(`
      <g class="flow-edge-group" data-edge-id="${edge.id}">
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
  elements.flowSelectionStatus.textContent = selectedNode
    ? `${getFlowShapeLabel(selectedNode.type)} 선택됨`
    : "도형을 선택하고 추가하세요.";
  elements.flowConnectStatus.textContent = flowBuilder.connectMode
    ? flowBuilder.connectSource
      ? `${getFlowShapeLabel(getFlowNode(flowBuilder.connectSource.nodeId)?.type)}의 ${translatePort(flowBuilder.connectSource.port)} 포트에서 연결 중`
      : "연결 시작 포트를 선택하세요."
    : "연결 모드 꺼짐";
}

function syncFlowPropertyPanel() {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  const isDisabled = !node;
  elements.flowPropertiesPanel.classList.toggle("open", !isDisabled);
  elements.flowNodeLabelInput.disabled = isDisabled;
  elements.flowNodeTypeSelect.disabled = isDisabled;
  elements.flowCustomColor.disabled = isDisabled;
  elements.applyFlowColor.disabled = isDisabled;
  elements.deleteFlowSelection.disabled = isDisabled;
  elements.flowColorSwatches.forEach((button) => {
    button.disabled = isDisabled;
  });
  if (!node) {
    elements.flowNodeLabelInput.value = "";
    elements.flowNodeTypeSelect.value = flowBuilder.tool;
    return;
  }
  elements.flowNodeLabelInput.value = node.label;
  elements.flowNodeTypeSelect.value = node.type;
  syncFlowColorControls(node.fill);
}

function handleFlowCanvasPointerDown(event) {
  if (event.target !== elements.flowCanvas && event.target !== elements.flowNodeLayer) return;
  flowBuilder.selectedNodeId = null;
  if (!flowBuilder.connectMode) {
    renderFlowBuilder();
  }
}

function handleFlowNodePointerDown(event) {
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
  syncFlowColorControls(node.fill);

  const rect = elements.flowCanvas.getBoundingClientRect();
  flowDragState = {
    nodeId: node.id,
    offsetX: (event.clientX - rect.left) / flowBuilder.zoom - node.x + elements.flowCanvasViewport.scrollLeft / flowBuilder.zoom,
    offsetY: (event.clientY - rect.top) / flowBuilder.zoom - node.y + elements.flowCanvasViewport.scrollTop / flowBuilder.zoom,
  };
  nodeButton.setPointerCapture?.(event.pointerId);
  renderFlowBuilder();
}

function handleFlowPointerMove(event) {
  if (!flowDragState) return;
  const node = getFlowNode(flowDragState.nodeId);
  if (!node) return;
  const rect = elements.flowCanvas.getBoundingClientRect();
  const nextX = snapFlow((event.clientX - rect.left) / flowBuilder.zoom + elements.flowCanvasViewport.scrollLeft / flowBuilder.zoom - flowDragState.offsetX);
  const nextY = snapFlow((event.clientY - rect.top) / flowBuilder.zoom + elements.flowCanvasViewport.scrollTop / flowBuilder.zoom - flowDragState.offsetY);
  node.x = clampFlow(nextX, 24, flowBuilder.width - node.width - 24);
  node.y = clampFlow(nextY, 24, flowBuilder.height - node.height - 24);
  renderFlowEdges();
  renderFlowNodes();
}

function stopFlowDrag() {
  if (!flowDragState) return;
  flowDragState = null;
  renderFlowBuilder();
}

function clampFlow(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function handleFlowPortSelection(nodeId, port) {
  if (!flowBuilder.connectMode) {
    flowBuilder.selectedNodeId = nodeId;
    renderFlowBuilder();
    return;
  }
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
  renderFlowBuilder();
}

function handleFlowEdgeDoubleClick(event) {
  const edgeGroup = event.target.closest("[data-edge-id]");
  if (!edgeGroup) return;
  const edge = flowBuilder.edges.find((item) => item.id === edgeGroup.dataset.edgeId);
  if (!edge) return;
  const nextLabel = window.prompt("선 중앙 텍스트를 입력하세요.", edge.label || "");
  if (nextLabel == null) return;
  edge.label = nextLabel.trim();
  renderFlowEdges();
}

function handleFlowEdgeClick(event) {
  const labelGroup = event.target.closest("[data-edge-label='true']");
  if (!labelGroup) return;
  const edge = flowBuilder.edges.find((item) => item.id === labelGroup.dataset.edgeId);
  if (!edge) return;
  const nextLabel = window.prompt("선 중앙 텍스트를 입력하세요.", edge.label || "");
  if (nextLabel == null) return;
  edge.label = nextLabel.trim();
  renderFlowEdges();
}

function deleteSelectedFlowNode() {
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

function updateSelectedFlowNodeType(type) {
  const node = getFlowNode(flowBuilder.selectedNodeId);
  const template = flowShapeTemplates[type];
  if (!node || !template) return;
  const previousType = node.type;
  node.type = type;
  node.width = template.width;
  node.height = template.height;
  if (node.label === flowShapeTemplates[previousType]?.label || !node.label.trim()) {
    node.label = template.label;
  }
  if (!node.fill || node.fill === flowShapeTemplates[previousType]?.defaultColor) {
    node.fill = template.defaultColor;
  }
  selectFlowColor(node.fill);
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
  setExtractorSidebarOpen(false);
  syncExtractorResponsiveLayout();
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
  setExtractorSidebarOpen(false);
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
  if (elements.extractorShell.classList.contains("hidden")) return;
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
  if (!isCompact) {
    extractorSidebarOpen = false;
  }
  elements.extractorShell.classList.toggle(
    "sidebar-open",
    isCompact && extractorSidebarOpen,
  );
  elements.toggleExtractorSidebar.hidden = !isCompact;
  elements.toggleExtractorSidebar.textContent =
    isCompact && extractorSidebarOpen ? "도구 닫기" : "도구 열기";
  elements.toggleExtractorSidebar.setAttribute(
    "aria-expanded",
    isCompact && extractorSidebarOpen ? "true" : "false",
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
