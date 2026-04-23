const path = require("node:path");
const { chromium } = require("playwright");
const { parseScenarioText } = require("./parser");
const { writeReports } = require("./report");

function normalizeUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("테스트 대상 URL을 입력하세요.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function resolveTarget(baseUrl, target) {
  const raw = String(target || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return new URL(raw, baseUrl).toString();
  if (raw === "홈" || raw.toLowerCase() === "home") return baseUrl;
  return new URL(raw.replace(/^\s+/, ""), baseUrl).toString();
}

async function runAutoQa(options) {
  const baseUrl = normalizeUrl(options.baseUrl);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const scenarios = buildRunList(options.scenarioText);
  const totalUnits = scenarios.length + 1;
  let completedUnits = 0;

  const emitProgress = (phase, currentTitle = "") => {
    const elapsedMs = Date.now() - started;
    const estimatedTotalMs = completedUnits > 0
      ? Math.max(elapsedMs, Math.round((elapsedMs / completedUnits) * totalUnits))
      : totalUnits * 6000;
    options.onProgress?.({
      phase,
      currentTitle,
      completed: completedUnits,
      total: totalUnits,
      percent: Math.round((completedUnits / totalUnits) * 100),
      elapsedMs,
      estimatedTotalMs,
      remainingMs: Math.max(0, estimatedTotalMs - elapsedMs)
    });
  };

  emitProgress("starting", "브라우저 준비 중");
  checkCancellation(options.cancellationToken);
  const browser = await chromium.launch({ headless: options.headless !== false });
  if (options.cancellationToken) options.cancellationToken.browser = browser;
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1920, height: 1400 },
    ignoreHTTPSErrors: Boolean(options.ignoreHTTPSErrors)
  });

  const results = [];
  try {
    checkCancellation(options.cancellationToken);
    emitProgress("running", "기본 URL 상태 점검");
    results.push(await runHealthCheck(context, baseUrl, options.artifactsDir));
    completedUnits += 1;
    emitProgress("running", "기본 URL 상태 점검 완료");

    if (options.failFast) {
      for (const scenario of scenarios) {
        checkCancellation(options.cancellationToken);
        emitProgress("running", scenario.title);
        results.push(await runScenario(context, baseUrl, scenario, options.artifactsDir));
        completedUnits += 1;
        emitProgress("running", `${scenario.title} 완료`);
        if (results.at(-1).status === "failed") break;
      }
      checkCancellation(options.cancellationToken);
    } else {
      results.push(
        ...(await runScenarioQueue({
          context,
          baseUrl,
          scenarios,
          artifactsDir: options.artifactsDir,
          workers: options.workers,
          cancellationToken: options.cancellationToken,
          onScenarioStart: (scenario) => emitProgress("running", scenario.title),
          onScenarioDone: (scenario) => {
            completedUnits += 1;
            emitProgress("running", `${scenario.title} 완료`);
          }
        }))
      );
      checkCancellation(options.cancellationToken);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (options.cancellationToken) options.cancellationToken.browser = null;
  }

  const durationMs = Date.now() - started;
  const summary = {
    baseUrl,
    startedAt,
    durationMs,
    total: results.length,
    passed: results.filter((item) => item.status === "passed").length,
    failed: results.filter((item) => item.status === "failed").length
  };

  const reports = await writeReports({ summary, results, artifactsDir: options.artifactsDir });
  completedUnits = totalUnits;
  emitProgress("completed", "QA 완료");
  return { summary, results, reports };
}

async function runScenarioQueue({
  context,
  baseUrl,
  scenarios,
  artifactsDir,
  workers,
  cancellationToken,
  onScenarioStart,
  onScenarioDone
}) {
  const concurrency = Math.max(1, Math.min(Number(workers) || 1, 16, scenarios.length || 1));
  const results = new Array(scenarios.length);
  let cursor = 0;

  async function worker() {
    while (cursor < scenarios.length) {
      checkCancellation(cancellationToken);
      const index = cursor;
      cursor += 1;
      onScenarioStart?.(scenarios[index]);
      results[index] = await runScenario(context, baseUrl, scenarios[index], artifactsDir);
      onScenarioDone?.(scenarios[index]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

function checkCancellation(cancellationToken) {
  if (cancellationToken?.cancelled) {
    const error = new Error("QA 실행이 취소되었습니다.");
    error.code = "AUTOQA_CANCELLED";
    throw error;
  }
}

function buildRunList(scenarioText) {
  const parsed = parseScenarioText(scenarioText);
  if (parsed.length > 0) return parsed;

  return [
    {
      id: "default-home",
      title: "홈 페이지 로딩 확인",
      priority: "Critical",
      tags: ["smoke"],
      steps: [{ action: "goto", target: "/" }]
    }
  ];
}

async function runHealthCheck(context, baseUrl, artifactsDir) {
  const started = Date.now();
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));

  try {
    const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!response || !response.ok()) {
      throw new Error(`초기 페이지 응답 실패: ${response ? response.status() : "no response"}`);
    }

    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    const brokenImages = await page.locator("img").evaluateAll((images) =>
      images
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
    );

    if (consoleErrors.length || failedRequests.length || brokenImages.length) {
      throw new Error([
        consoleErrors.length ? `콘솔 오류 ${consoleErrors.length}건` : "",
        failedRequests.length ? `네트워크 실패 ${failedRequests.length}건` : "",
        brokenImages.length ? `깨진 이미지 ${brokenImages.length}건` : ""
      ].filter(Boolean).join(", "));
    }

    return {
      id: "health-check",
      title: "기본 URL 상태 점검",
      status: "passed",
      durationMs: Date.now() - started
    };
  } catch (error) {
    const screenshot = path.join(artifactsDir, "health-check.png");
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    return {
      id: "health-check",
      title: "기본 URL 상태 점검",
      status: "failed",
      durationMs: Date.now() - started,
      error: error.message,
      screenshot
    };
  } finally {
    await page.close();
  }
}

async function runScenario(context, baseUrl, scenario, artifactsDir) {
  const started = Date.now();
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (const step of scenario.steps) {
      await executeStep(page, baseUrl, step, artifactsDir, scenario.id);
    }

    return {
      id: scenario.id,
      title: scenario.title,
      priority: scenario.priority,
      tags: scenario.tags,
      status: "passed",
      durationMs: Date.now() - started
    };
  } catch (error) {
    const safeId = scenario.id.replace(/[^a-z0-9_-]/gi, "-");
    const screenshot = path.join(artifactsDir, `${safeId}.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    return {
      id: scenario.id,
      title: scenario.title,
      priority: scenario.priority,
      tags: scenario.tags,
      status: "failed",
      durationMs: Date.now() - started,
      error: error.message,
      screenshot
    };
  } finally {
    await page.close();
  }
}

async function executeStep(page, baseUrl, step, artifactsDir, scenarioId) {
  switch (step.action) {
    case "goto":
      await page.goto(resolveTarget(baseUrl, step.target), { waitUntil: "domcontentloaded", timeout: 30000 });
      return;
    case "fill":
      await fillByLabelOrPlaceholder(page, step.target, step.value);
      return;
    case "click":
      await clickByText(page, step.target);
      return;
    case "select":
      await selectByLabelOrText(page, step.target, step.value);
      return;
    case "download":
      await downloadByClick(page, step.target, artifactsDir, scenarioId);
      return;
    case "expectText":
      await expectTextWithScroll(page, step.target);
      return;
    case "expectUrlContains":
      if (!page.url().includes(step.value)) {
        throw new Error(`현재 URL에 '${step.value}'가 포함되지 않습니다. 현재 URL: ${page.url()}`);
      }
      return;
    case "wait":
      await page.waitForTimeout(Number(step.value) || 1000);
      return;
    case "note":
      return;
    default:
      throw new Error(`지원하지 않는 액션입니다: ${step.action}`);
  }
}

async function expectTextWithScroll(page, text) {
  const target = page.getByText(text, { exact: false }).first();
  if (await target.isVisible({ timeout: 12000 }).catch(() => false)) return;

  const overlayTarget = page.locator(
    [
      ".ant-modal",
      ".ant-message",
      ".ant-notification",
      ".ant-popover",
      "[role='dialog']",
      "[role='alert']"
    ].join(", "),
    { hasText: text }
  ).first();
  if (await overlayTarget.isVisible({ timeout: 3000 }).catch(() => false)) return;

  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  const viewportHeight = await page.evaluate(() => window.innerHeight).catch(() => 900);
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
  const maxSteps = Math.max(1, Math.ceil(documentHeight / Math.max(1, viewportHeight)));

  for (let index = 0; index <= maxSteps; index += 1) {
    if (await target.isVisible({ timeout: 700 }).catch(() => false)) return;
    await page.mouse.wheel(0, Math.round(viewportHeight * 0.75));
    await page.waitForTimeout(120);
  }

  await target.waitFor({ timeout: 12000 });
}

async function selectByLabelOrText(page, label, value) {
  const nativeSelect = page
    .locator(
      [
        `select[aria-label*="${cssEscape(label)}" i]`,
        `select[name*="${cssEscape(label)}" i]`,
        `select[id*="${cssEscape(label)}" i]`
      ].join(", ")
    )
    .first();

  if (await nativeSelect.isVisible().catch(() => false)) {
    await nativeSelect.selectOption({ label: value }).catch(async () => {
      await nativeSelect.selectOption(value);
    });
    return;
  }

  const candidates = [
    page.getByRole("combobox", { name: label, exact: false }),
    page.getByLabel(label, { exact: false }),
    page.getByText(label, { exact: false })
  ];

  for (const locator of candidates) {
    const trigger = locator.first();
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await chooseOpenOption(page, value);
      return;
    }
  }

  throw new Error(`선택 필드를 찾지 못했습니다: ${label}`);
}

async function chooseOpenOption(page, value) {
  const candidates = [
    page.getByRole("option", { name: value, exact: false }),
    page.locator(".ant-select-item-option", { hasText: value }),
    page.getByText(value, { exact: false })
  ];

  for (const locator of candidates) {
    const option = locator.first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await page.waitForTimeout(150);
      return;
    }
  }

  throw new Error(`드롭다운 옵션을 찾지 못했습니다: ${value}`);
}

async function downloadByClick(page, text, artifactsDir, scenarioId) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    clickByText(page, text)
  ]);
  const suggested = download.suggestedFilename() || `${scenarioId || "download"}.xlsx`;
  const filePath = path.join(artifactsDir, suggested);
  await download.saveAs(filePath);
}

async function fillByLabelOrPlaceholder(page, label, value) {
  const normalizedLabel = String(label || "").trim();
  const baseLabel = normalizedLabel.replace(/\s*입력$/, "").trim();
  const labelVariants = Array.from(new Set([normalizedLabel, baseLabel].filter(Boolean)));
  const candidates = [
    ...labelVariants.flatMap((variant) => [
      page.getByPlaceholder(variant, { exact: false }),
      page.getByPlaceholder(`${variant} 입력`, { exact: false }),
      page.getByRole("textbox", { name: variant, exact: false }),
      page.locator(
        [
          `input[placeholder*="${cssEscape(variant)}" i]`,
          `textarea[placeholder*="${cssEscape(variant)}" i]`,
          `input[name*="${cssEscape(variant)}" i]`,
          `textarea[name*="${cssEscape(variant)}" i]`,
          `input[id*="${cssEscape(variant)}" i]`,
          `textarea[id*="${cssEscape(variant)}" i]`
        ].join(", ")
      ),
      page.getByLabel(variant, { exact: false })
    ]),
    page.locator(
      [
        ".ant-popover:not(.ant-popover-hidden) input:not([type='hidden'])",
        ".ant-popover:not(.ant-popover-hidden) textarea",
        ".ant-dropdown:not(.ant-dropdown-hidden) input:not([type='hidden'])",
        ".ant-dropdown:not(.ant-dropdown-hidden) textarea",
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden) input:not([type='hidden'])",
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden) textarea"
      ].join(", ")
    )
  ];

  for (const locator of candidates) {
    const field = locator.first();
    if (await isFillable(field)) {
      await robustFill(field, value);
      return;
    }
  }

  if (await fillActiveElement(page, value)) return;

  throw new Error(`입력 필드를 찾지 못했습니다: ${normalizedLabel}`);
}

async function fillActiveElement(page, value) {
  return page.evaluate((inputValue) => {
    const element = document.activeElement;
    if (!element) return false;
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute("type") || "text").toLowerCase();
    const fillable = tag === "textarea" || (tag === "input" && ![
      "button",
      "checkbox",
      "file",
      "hidden",
      "radio",
      "range",
      "reset",
      "submit"
    ].includes(type));
    if (!fillable || element.disabled || element.readOnly) return false;
    element.value = inputValue;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }, String(value)).catch(() => false);
}

async function robustFill(locator, value) {
  await locator.click();
  await locator.fill(String(value));
  await locator.evaluate((element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  });
  await locator.page().waitForTimeout(150);
}

async function isFillable(locator) {
  const visible = await locator.isVisible().catch(() => false);
  if (!visible) return false;

  return locator.evaluate((element) => {
    const tag = element.tagName.toLowerCase();
    if (tag === "textarea") return !element.disabled && !element.readOnly;
    if (tag !== "input") return false;

    const type = (element.getAttribute("type") || "text").toLowerCase();
    const nonFillableTypes = new Set([
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit"
    ]);

    return !nonFillableTypes.has(type) && !element.disabled && !element.readOnly;
  }).catch(() => false);
}

async function clickByText(page, text) {
  const candidates = [
    page.getByRole("button", { name: text, exact: false }),
    page.getByRole("link", { name: text, exact: false }),
    page.getByText(text, { exact: false })
  ];

  for (const locator of candidates) {
    const target = locator.first();
    if (await target.isVisible().catch(() => false)) {
      await clickEnabledTarget(target, text);
      return;
    }
  }

  throw new Error(`클릭 대상을 찾지 못했습니다: ${text}`);
}

async function clickEnabledTarget(locator, text) {
  const disabled = await isDisabled(locator);
  if (disabled) {
    const validationText = await collectValidationText(locator.page());
    throw new Error(
      [
        `클릭 대상이 비활성화되어 있습니다: ${text}`,
        validationText ? `화면 validation: ${validationText}` : ""
      ].filter(Boolean).join(" / ")
    );
  }

  try {
    await locator.click({ timeout: 10000 });
  } catch (error) {
    if (await clickAntSelectContainer(locator)) return;
    throw error;
  }
  await locator.page().waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await locator.page().waitForTimeout(300);
}

async function clickAntSelectContainer(locator) {
  const container = locator.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ant-select-selector ')][1]"
  );
  if (await container.isVisible().catch(() => false)) {
    await container.click({ force: true });
    return true;
  }

  const select = locator.locator(
    "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ant-select ')][1]"
  );
  const selector = select.locator(".ant-select-selector").first();
  if (await selector.isVisible().catch(() => false)) {
    await selector.click({ force: true });
    return true;
  }

  return false;
}

async function isDisabled(locator) {
  return locator.evaluate((element) => {
    return Boolean(
      element.disabled ||
      element.getAttribute("aria-disabled") === "true" ||
      element.classList.contains("ant-btn-disabled")
    );
  }).catch(() => false);
}

async function collectValidationText(page) {
  return page.locator(
    [
      ".ant-form-item-explain-error",
      "[role='alert']",
      ".error",
      ".invalid-feedback"
    ].join(", ")
  ).evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(" / ")
  ).catch(() => "");
}

function cssEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

module.exports = {
  runAutoQa,
  normalizeUrl,
  resolveTarget
};
