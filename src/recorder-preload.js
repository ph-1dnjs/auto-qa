const { ipcRenderer } = require("electron");

const state = {
  enabled: false,
  steps: [],
  pins: [],
  draft: null
};

function ready(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  } else {
    callback();
  }
}

ready(() => {
  installStyles();
  installPanel();
  installCaptureLayer();
});

function installStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #autoqa-recorder-panel {
      position: fixed;
      z-index: 2147483647;
      top: 18px;
      right: 18px;
      width: 360px;
      max-height: calc(100vh - 36px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border: 1px solid #d7dfeb;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.97);
      box-shadow: 0 16px 42px rgba(15, 23, 42, 0.18);
      color: #172033;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
    }
    #autoqa-recorder-panel * { box-sizing: border-box; }
    #autoqa-recorder-panel h2 { margin: 0; font-size: 16px; }
    #autoqa-recorder-panel p { margin: 0; color: #667085; line-height: 1.45; }
    #autoqa-recorder-panel button,
    #autoqa-recorder-panel input {
      height: 34px;
      border-radius: 7px;
      border: 1px solid #d7dfeb;
      background: #fff;
      color: #172033;
      font: inherit;
    }
    #autoqa-recorder-panel button {
      cursor: pointer;
      padding: 0 10px;
      font-weight: 700;
    }
    #autoqa-recorder-panel .primary {
      border-color: #1d4ed8;
      background: #1d4ed8;
      color: #fff;
    }
    #autoqa-recorder-panel .danger {
      border-color: #fecaca;
      background: #fee2e2;
      color: #b42318;
    }
    #autoqa-recorder-panel .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    #autoqa-recorder-panel .steps {
      overflow: auto;
      max-height: 280px;
      border: 1px solid #e5eaf2;
      border-radius: 7px;
      background: #f8fafc;
    }
    #autoqa-recorder-panel .step {
      padding: 8px;
      border-bottom: 1px solid #e5eaf2;
      line-height: 1.4;
    }
    #autoqa-recorder-panel .step:last-child { border-bottom: 0; }
    #autoqa-capture-layer {
      display: none;
      position: fixed;
      z-index: 2147483644;
      inset: 0;
      background: rgba(29, 78, 216, 0.035);
      cursor: crosshair;
    }
    #autoqa-capture-layer.active { display: block; }
    .autoqa-pin {
      position: fixed;
      z-index: 2147483645;
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      border: 2px solid #fff;
      background: #1d4ed8;
      color: #fff;
      font: 800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 10px 24px rgba(29, 78, 216, 0.38);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .autoqa-pin.result { background: #e11d48; }
    .autoqa-pin.pending { background: #0ea5e9; animation: autoqa-pulse 1s infinite alternate; }
    @keyframes autoqa-pulse { from { transform: translate(-50%, -50%) scale(1); } to { transform: translate(-50%, -50%) scale(1.12); } }
    #autoqa-pin-editor {
      position: fixed;
      z-index: 2147483646;
      width: 320px;
      display: none;
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 12px;
      border: 1px solid #d7dfeb;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.24);
      color: #172033;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
    }
    #autoqa-pin-editor.open { display: grid; }
    #autoqa-pin-editor label { display: grid; gap: 5px; color: #667085; font-size: 12px; font-weight: 700; }
    #autoqa-pin-editor input,
    #autoqa-pin-editor select {
      width: 100%;
      height: 34px;
      border: 1px solid #d7dfeb;
      border-radius: 7px;
      padding: 0 9px;
      background: #fff;
      color: #172033;
      font: inherit;
    }
    #autoqa-pin-editor .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    #autoqa-pin-editor button {
      height: 34px;
      border-radius: 7px;
      border: 1px solid #d7dfeb;
      background: #fff;
      color: #172033;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    #autoqa-pin-editor .primary {
      border-color: #1d4ed8;
      background: #1d4ed8;
      color: #fff;
    }
  `;
  document.documentElement.appendChild(style);
}

function installPanel() {
  const panel = document.createElement("div");
  panel.id = "autoqa-recorder-panel";
  panel.innerHTML = `
    <h2>AutoQA 시나리오 추출</h2>
    <p>핀 추가를 켠 뒤 원하는 위치를 클릭하세요. 숫자 핀이 생성되고 액션 등록 카드가 열립니다.</p>
    <button id="autoqa-toggle" class="primary" type="button">핀 추가 켜기</button>
    <input id="autoqa-title" placeholder="시나리오 제목" value="추출 시나리오">
    <div class="steps" id="autoqa-steps"></div>
    <div class="row">
      <button id="autoqa-goto" type="button">현재 경로 추가</button>
      <button id="autoqa-undo" type="button">마지막 삭제</button>
    </div>
    <div class="row">
      <button id="autoqa-clear" class="danger" type="button">초기화</button>
      <button id="autoqa-commit" class="primary" type="button">시나리오 추가</button>
    </div>
  `;
  document.documentElement.appendChild(panel);

  panel.querySelector("#autoqa-toggle").addEventListener("click", () => {
    setCaptureEnabled(!state.enabled);
  });
  panel.querySelector("#autoqa-goto").addEventListener("click", () => {
    addConfirmedStep(`Given ${window.location.pathname || "/"} 페이지로 이동한다`, null, "action");
  });
  panel.querySelector("#autoqa-undo").addEventListener("click", undoStep);
  panel.querySelector("#autoqa-clear").addEventListener("click", clearSteps);
  panel.querySelector("#autoqa-commit").addEventListener("click", commitScenario);
  renderSteps();
}

function installCaptureLayer() {
  const layer = document.createElement("div");
  layer.id = "autoqa-capture-layer";
  document.documentElement.appendChild(layer);

  const editor = document.createElement("div");
  editor.id = "autoqa-pin-editor";
  editor.innerHTML = `
    <label>액션 유형
      <select id="autoqa-action-type">
        <option value="click">클릭</option>
        <option value="fill">입력</option>
        <option value="select">선택</option>
        <option value="download">다운로드</option>
        <option value="result">결과 확인</option>
      </select>
    </label>
    <label>대상 이름
      <input id="autoqa-action-label" placeholder="예: 상품명, 로그인, 대시보드">
    </label>
    <label id="autoqa-action-value-wrap">입력/선택/결과 값
      <input id="autoqa-action-value" placeholder="예: 리쥬란">
    </label>
    <div class="row">
      <button id="autoqa-editor-cancel" type="button">취소</button>
      <button id="autoqa-editor-save" class="primary" type="button">등록</button>
    </div>
  `;
  document.documentElement.appendChild(editor);

  layer.addEventListener("click", (event) => {
    if (!state.enabled) return;
    event.preventDefault();
    event.stopPropagation();
    createDraftAt(event.clientX, event.clientY);
  });

  editor.querySelector("#autoqa-action-type").addEventListener("change", updateValueField);
  editor.querySelector("#autoqa-editor-cancel").addEventListener("click", cancelDraft);
  editor.querySelector("#autoqa-editor-save").addEventListener("click", saveDraft);
}

function setCaptureEnabled(enabled) {
  state.enabled = enabled;
  document.querySelector("#autoqa-capture-layer")?.classList.toggle("active", enabled);
  const toggle = document.querySelector("#autoqa-toggle");
  if (toggle) toggle.textContent = enabled ? "핀 추가 끄기" : "핀 추가 켜기";
}

function createDraftAt(clientX, clientY) {
  cancelDraft();

  const layer = document.querySelector("#autoqa-capture-layer");
  layer.classList.remove("active");
  const element = document.elementFromPoint(clientX, clientY);
  layer.classList.add("active");

  const label = inferLabel(element);
  const inferredType = inferActionType(element);
  const order = state.steps.length + 1;
  const pin = createPin(clientX, clientY, order, "pending");

  state.draft = { pin, clientX, clientY, element, label };
  openEditor(clientX, clientY, inferredType, label);
}

function openEditor(clientX, clientY, actionType, label) {
  const editor = document.querySelector("#autoqa-pin-editor");
  editor.querySelector("#autoqa-action-type").value = actionType;
  editor.querySelector("#autoqa-action-label").value = label;
  editor.querySelector("#autoqa-action-value").value = "";
  updateValueField();

  const left = Math.min(window.innerWidth - 340, Math.max(16, clientX + 18));
  const top = Math.min(window.innerHeight - 260, Math.max(16, clientY + 18));
  editor.style.left = `${left}px`;
  editor.style.top = `${top}px`;
  editor.classList.add("open");
}

function updateValueField() {
  const actionType = document.querySelector("#autoqa-action-type")?.value;
  const wrap = document.querySelector("#autoqa-action-value-wrap");
  if (!wrap) return;
  wrap.style.display = ["fill", "select", "result"].includes(actionType) ? "grid" : "none";
}

function cancelDraft() {
  if (state.draft?.pin) state.draft.pin.remove();
  state.draft = null;
  document.querySelector("#autoqa-pin-editor")?.classList.remove("open");
}

function saveDraft() {
  if (!state.draft) return;

  const actionType = document.querySelector("#autoqa-action-type").value;
  const label = cleanText(document.querySelector("#autoqa-action-label").value || state.draft.label || "대상");
  const value = document.querySelector("#autoqa-action-value").value;
  const step = buildStep(actionType, label, value);
  if (!step) return;

  state.draft.pin.classList.remove("pending");
  state.draft.pin.classList.toggle("result", actionType === "result");
  addConfirmedStep(step, state.draft.pin, actionType);
  state.draft = null;
  document.querySelector("#autoqa-pin-editor")?.classList.remove("open");
}

function buildStep(actionType, label, value) {
  if (actionType === "fill") return `When ${label}을 '${value}' 으로 입력한다`;
  if (actionType === "select") return `When ${label}에서 '${value}' 을 선택한다`;
  if (actionType === "download") return `When ${label} 버튼을 클릭하여 다운로드한다`;
  if (actionType === "result") return `Then ${value || label} 텍스트가 보인다`;
  return `When ${label} 버튼을 클릭한다`;
}

function addConfirmedStep(step, pin, actionType) {
  state.steps.push({ step, pin, actionType });
  if (pin) state.pins.push(pin);
  renderSteps();
}

function createPin(clientX, clientY, order, extraClass = "") {
  const pin = document.createElement("div");
  pin.className = `autoqa-pin ${extraClass}`.trim();
  pin.textContent = order;
  pin.style.left = `${clientX}px`;
  pin.style.top = `${clientY}px`;
  document.documentElement.appendChild(pin);
  return pin;
}

function undoStep() {
  const item = state.steps.pop();
  if (item?.pin) item.pin.remove();
  state.pins = state.pins.filter((pin) => pin !== item?.pin);
  renderSteps();
}

function clearSteps() {
  cancelDraft();
  state.steps = [];
  state.pins.forEach((pin) => pin.remove());
  state.pins = [];
  renderSteps();
}

function renderSteps() {
  const container = document.querySelector("#autoqa-steps");
  if (!container) return;
  container.innerHTML = state.steps.length
    ? state.steps
      .map((item, index) => `<div class="step"><strong>${index + 1}.</strong> ${escapeHtml(item.step)}</div>`)
      .join("")
    : `<div class="step">아직 추가된 핀이 없습니다.</div>`;
}

function commitScenario() {
  const title = document.querySelector("#autoqa-title")?.value || "추출 시나리오";
  const steps = state.steps.length
    ? state.steps.map((item) => item.step)
    : [`Given ${window.location.pathname || "/"} 페이지로 이동한다`];
  const markdown = [
    `# 시나리오: ${title}`,
    "priority: Medium",
    "tags: [extracted]",
    "",
    ...steps
  ].join("\n");

  ipcRenderer.send("scenario:extracted", {
    title,
    markdown,
    url: window.location.href
  });
}

function inferActionType(element) {
  if (!element) return "click";
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || "";
  if (tag === "input" || tag === "textarea") return "fill";
  if (tag === "select" || role === "combobox" || element.closest(".ant-select")) return "select";
  if (element.closest("button, a, [role='button']")) return "click";
  return "result";
}

function inferLabel(element) {
  if (!element) return "대상";
  const clickable = element.closest("button, a, [role='button'], .ant-select, label") || element;
  const aria = clickable.getAttribute("aria-label") || element.getAttribute("aria-label");
  if (aria) return cleanText(aria);

  const placeholder = element.getAttribute("placeholder");
  if (placeholder) return cleanText(placeholder);

  const title = clickable.getAttribute("title") || element.getAttribute("title");
  if (title) return cleanText(title);

  const text = cleanText(clickable.innerText || clickable.textContent || element.innerText || element.textContent || "");
  if (text) return text;

  const label = findNearbyLabel(element);
  if (label) return label;

  const name = element.getAttribute("name") || element.getAttribute("id") || "대상";
  return cleanText(name);
}

function findNearbyLabel(element) {
  const id = element.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
    if (label?.textContent) return cleanText(label.textContent);
  }

  const wrappingLabel = element.closest("label");
  if (wrappingLabel?.textContent) return cleanText(wrappingLabel.textContent);

  const parentText = cleanText(element.parentElement?.textContent || "");
  if (parentText && parentText.length <= 40) return parentText;
  return "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function cssEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
