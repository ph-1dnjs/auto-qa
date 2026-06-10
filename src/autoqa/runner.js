const path = require("node:path");
const { chromium, firefox, webkit } = require("playwright");
const { getChromiumFallbackOptions, resolveBrowserOption } = require("./browser-options");
const { filterScenarios, prepareScenarios } = require("./planner");
const { writeReports } = require("./report");

const playwrightBrowsers = {
  chromium,
  firefox,
  webkit
};

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

function collectRunVideos(results) {
  return results
    .filter((result) => result?.videoPath)
    .map((result, index) => ({
      index: index + 1,
      title: result.title || `video-${index + 1}`,
      status: result.status || "completed",
      filePath: result.videoPath,
    }));
}

async function runAutoQa(options) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const scenarios = buildRunList(options.scenarioText, options.selection);
  const environments = normalizeEnvironments(options.baseUrl, options.environments)
    .map((environment) => ({ ...environment, scenarioCount: scenarios.length }));
  const totalUnits = environments.reduce((sum, environment) => sum + environment.scenarioCount + 1, 0);
  let completedUnits = 0;
  const scenarioProgress = {
    total: environments.reduce((sum, environment) => sum + environment.scenarioCount, 0),
    completed: 0,
    passed: 0,
    failed: 0
  };

  const emitProgress = (phase, currentTitle = "", extra = {}) => {
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
      scenarioTotal: scenarioProgress.total,
      scenarioCompleted: scenarioProgress.completed,
      scenarioPassed: scenarioProgress.passed,
      scenarioFailed: scenarioProgress.failed,
      elapsedMs,
      estimatedTotalMs,
      remainingMs: Math.max(0, estimatedTotalMs - elapsedMs),
      ...extra
    });
  };

  const emitPagePreview = async (page, currentTitle, extra = {}) => {
    if (options.headless === false) return;
    const previewImage = await capturePagePreview(page);
    if (!previewImage) return;
    emitProgress("preview", currentTitle, {
      previewImage,
      previewUrl: page.url(),
      ...extra
    });
  };

  const results = [];
  const environmentSummaries = [];

  for (const environment of environments) {
    emitProgress("starting", `${environment.name} 환경 준비 중`);
    const environmentResult = await runEnvironmentQa({
      ...options,
      baseUrl: environment.baseUrl,
      environment,
      scenarios,
      onPreview: (page, currentTitle, extra = {}) =>
        emitPagePreview(page, `[${environment.name}] ${currentTitle}`, {
          environmentName: environment.name,
          ...extra
        }),
      onUnitComplete: (result) => {
        completedUnits += 1;
        if (result?.kind === "scenario") {
          updateScenarioProgress(scenarioProgress, result.payload);
        }
      },
      onProgressTitle: (title) => emitProgress("running", `[${environment.name}] ${title}`),
    });

    results.push(...environmentResult.results);
    environmentSummaries.push(environmentResult.summary);
  }

  const durationMs = Date.now() - started;
  const selectedBrowser = resolveBrowserOption(options.browserId);
  const summary = {
    runId: options.runId || `run-${Date.now()}`,
    baseUrl: environments[0]?.baseUrl || "",
    browserId: selectedBrowser.id,
    browserLabel: selectedBrowser.label,
    startedAt,
    durationMs,
    total: results.length,
    passed: results.filter((item) => item.status === "passed").length,
    failed: results.filter((item) => item.status === "failed").length,
    scenarioTotal: scenarioProgress.total,
    scenarioPassed: scenarioProgress.passed,
    scenarioFailed: scenarioProgress.failed,
    environmentCount: environmentSummaries.length,
    environments: environmentSummaries
  };

  const reports = await writeReports({ summary, results, artifactsDir: options.artifactsDir });
  const videos = collectRunVideos(results);
  completedUnits = totalUnits;
  emitProgress("completed", "QA 완료");
  return {
    summary,
    results,
    reports: {
      ...reports,
      videoDir: path.join(options.artifactsDir, "videos"),
      videoCount: videos.length,
      videos,
    },
  };
}

async function runEnvironmentQa(options) {
  const started = Date.now();
  const selectedBrowser = resolveBrowserOption(options.browserId);
  const browser = await launchBrowserForQa(selectedBrowser, {
    headless: options.headless !== false,
  });
  if (options.cancellationToken) options.cancellationToken.browser = browser;

  const context = await browser.newContext({
    baseURL: options.baseUrl,
    viewport: { width: 1920, height: 1400 },
    ignoreHTTPSErrors: Boolean(options.ignoreHTTPSErrors),
    recordVideo: {
      dir: path.join(options.artifactsDir, "videos"),
      size: { width: 1440, height: 960 },
    },
  });

  const results = [];
  try {
    checkCancellation(options.cancellationToken);
    options.onProgressTitle?.("기본 URL 상태 점검");
    const healthResult = await runHealthCheck(
      context,
      options.baseUrl,
      options.artifactsDir,
      options.onPreview,
      options.environment
    );
    results.push(healthResult);
    options.onUnitComplete?.({ kind: "health", payload: healthResult });
    options.onProgressTitle?.("기본 URL 상태 점검 완료");

    if (options.failFast) {
      for (const scenario of options.scenarios) {
        checkCancellation(options.cancellationToken);
        options.onProgressTitle?.(scenario.title);
        const result = await runScenario(
          context,
          options.baseUrl,
          scenario,
          options.artifactsDir,
          options.onPreview,
          options.environment
        );
        results.push(result);
        options.onUnitComplete?.({ kind: "scenario", payload: result });
        options.onProgressTitle?.(`${scenario.title} 완료`);
        if (result.status === "failed") break;
      }
      checkCancellation(options.cancellationToken);
    } else {
      results.push(
        ...(await runScenarioQueue({
          context,
          baseUrl: options.baseUrl,
          scenarios: options.scenarios,
          artifactsDir: options.artifactsDir,
          workers: options.workers,
          cancellationToken: options.cancellationToken,
          onPreview: options.onPreview,
          environment: options.environment,
          onScenarioStart: (scenario) => options.onProgressTitle?.(scenario.title),
          onScenarioDone: (scenario, result) => {
            options.onUnitComplete?.({ kind: "scenario", payload: result });
            options.onProgressTitle?.(`${scenario.title} 완료`);
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

  return {
    summary: {
      id: options.environment.id,
      name: options.environment.name,
      baseUrl: options.baseUrl,
      browserId: selectedBrowser.id,
      browserLabel: selectedBrowser.label,
      total: results.length,
      passed: results.filter((item) => item.status === "passed").length,
      failed: results.filter((item) => item.status === "failed").length,
      durationMs: Date.now() - started
    },
    results
  };
}

async function runScenarioQueue({
  context,
  baseUrl,
  scenarios,
  artifactsDir,
  workers,
  cancellationToken,
  onPreview,
  environment,
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
      results[index] = await runScenario(
        context,
        baseUrl,
        scenarios[index],
        artifactsDir,
        onPreview,
        environment
      );
      onScenarioDone?.(scenarios[index], results[index]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function capturePagePreview(page) {
  try {
    const image = await page.screenshot({
      type: "jpeg",
      quality: 72,
      fullPage: false,
      animations: "disabled"
    });
    return `data:image/jpeg;base64,${image.toString("base64")}`;
  } catch {
    return "";
  }
}

async function launchBrowserForQa(browserOption, launchOptions) {
  const browserType = playwrightBrowsers[browserOption.browserName];
  const resolvedLaunchOptions = browserOption.channel
    ? { ...launchOptions, channel: browserOption.channel }
    : { ...launchOptions };

  try {
    return await browserType.launch(resolvedLaunchOptions);
  } catch (error) {
    if (browserOption.id !== "chromium" || !shouldFallbackToSystemChannel(error)) {
      throw decorateBrowserLaunchError(browserOption, error);
    }

    const channels = getChromiumFallbackOptions();
    const failures = [];
    for (const channelOption of channels) {
      try {
        return await browserType.launch({
          ...launchOptions,
          channel: channelOption.channel,
        });
      } catch (channelError) {
        failures.push(`${channelOption.label}: ${channelError.message}`);
      }
    }

    const fallbackError = new Error([
      `"${browserOption.label}" 실행에 실패했고 시스템 Chromium 계열 브라우저 폴백도 실패했습니다.`,
      ...failures,
    ].join(" "));
    fallbackError.cause = error;
    throw fallbackError;
  }
}

function decorateBrowserLaunchError(browserOption, error) {
  const wrapped = new Error(`"${browserOption.label}" 실행에 실패했습니다. ${error.message}`);
  wrapped.cause = error;
  return wrapped;
}

function shouldFallbackToSystemChannel(error) {
  const message = String(error?.message || "");
  return /Executable doesn't exist/i.test(message)
    || /Please run the following command to download new browsers/i.test(message)
    || /chrome-headless-shell/i.test(message);
}

function checkCancellation(cancellationToken) {
  if (cancellationToken?.cancelled) {
    const error = new Error("QA 실행이 취소되었습니다.");
    error.code = "AUTOQA_CANCELLED";
    throw error;
  }
}

function updateScenarioProgress(progress, result) {
  progress.completed += 1;
  if (result?.status === "passed") progress.passed += 1;
  if (result?.status === "failed") progress.failed += 1;
}

function formatStepPreview(step) {
  if (!step) return "단계 실행";
  if (step.action === "goto") return `${step.target} 페이지 이동`;
  if (step.action === "fill") return `${step.target} 입력`;
  if (step.action === "click") return `${step.target} 클릭`;
  if (step.action === "select") return `${step.target} 선택`;
  if (step.action === "download") return `${step.target} 다운로드`;
  if (step.action === "expectText") return `${step.target} 텍스트 확인`;
  if (step.action === "scrollToBottom") return "페이지 끝까지 스크롤";
  if (step.action === "expectButtonDisabled") return `${step.target} 버튼 비활성화 확인`;
  if (step.action === "expectButtonEnabled") return `${step.target} 버튼 활성화 확인`;
  if (step.action === "expectUrlContains") return `URL ${step.value} 포함 확인`;
  if (step.action === "wait") return `${Math.round((step.value || 0) / 1000)}초 대기`;
  return `${step.action || "단계"} 실행`;
}

function buildRunList(scenarioText, selection) {
  const parsed = prepareScenarios(scenarioText);
  const filtered = filterScenarios(parsed, selection);
  if (filtered.length > 0) {
    validateScenarioExecutability(filtered);
    return filtered;
  }
  if (parsed.length > 0 && selection && Object.keys(selection).length > 0) {
    throw new Error("선택한 Feature 또는 Suite에 해당하는 시나리오가 없습니다.");
  }
  if (parsed.length > 0) {
    validateScenarioExecutability(parsed);
    return parsed;
  }

  return [
    {
      id: "default-home",
      title: "홈 페이지 로딩 확인",
      priority: "Critical",
      tags: ["smoke"],
      featurePath: "공통",
      suite: "smoke",
      steps: [{ action: "goto", target: "/" }]
    }
  ];
}

function validateScenarioExecutability(scenarios) {
  const nonExecutable = scenarios.filter((scenario) => {
    const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
    return steps.length > 0 && steps.every((step) => step?.action === "note");
  });

  if (nonExecutable.length) {
    const titles = nonExecutable.slice(0, 3).map((scenario) => scenario.title).join(", ");
    const extra = nonExecutable.length > 3 ? ` 외 ${nonExecutable.length - 3}건` : "";
    throw new Error([
      "불러온 시나리오에 실행 가능한 QA 단계가 없습니다.",
      `대상: ${titles}${extra}`,
      "현재 엔진은 '/login 페이지로 이동한다', \"이메일을 'a@b.com' 으로 입력한다\", '저장 버튼을 클릭한다', '텍스트가 보인다' 같은 형식만 자동 실행할 수 있습니다.",
      "엑셀에서 가져온 원본 문장은 케이스 설명용이라 대부분 자동화 액션으로 해석되지 않습니다."
    ].join(" "));
  }

  const actionless = scenarios.filter((scenario) => {
    const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
    if (!steps.length) return false;
    return !steps.some(isInteractiveStep);
  });

  if (!actionless.length) return;

  const titles = actionless.slice(0, 3).map((scenario) => scenario.title).join(", ");
  const extra = actionless.length > 3 ? ` 외 ${actionless.length - 3}건` : "";
  throw new Error([
    "불러온 시나리오에 화면을 실제로 진행할 액션 단계가 없습니다.",
    `대상: ${titles}${extra}`,
    "현재 실행기는 이동, 입력, 클릭, 선택, 스크롤, 다운로드, 대기 같은 액션이 있어야 다음 화면으로 진행할 수 있습니다.",
    "텍스트 확인만 있는 시나리오는 렌더링된 첫 화면에서 멈춰 보일 수 있으므로, 엑셀 변환 규칙을 보강하거나 추출기에서 실제 플로우를 기록해야 합니다."
  ].join(" "));
}

function isInteractiveStep(step) {
  return [
    "goto",
    "fill",
    "click",
    "select",
    "download",
    "scrollToBottom",
    "wait"
  ].includes(step?.action);
}

function normalizeEnvironments(baseUrl, environments) {
  const provided = Array.isArray(environments) ? environments : [];
  const normalized = provided
    .map((environment, index) => ({
      id: environment.id || `env-${index + 1}`,
      name: String(environment.name || `환경 ${index + 1}`).trim(),
      baseUrl: normalizeUrl(environment.baseUrl)
    }))
    .filter((environment) => environment.baseUrl);

  if (normalized.length > 0) {
    return normalized.map((environment) => ({
      ...environment,
      scenarioCount: 0
    }));
  }

  return [{
    id: "default",
    name: "기본",
    baseUrl: normalizeUrl(baseUrl),
    scenarioCount: 0
  }];
}

async function runHealthCheck(context, baseUrl, artifactsDir, onPreview, environment) {
  const started = Date.now();
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  let result = null;

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
    await onPreview?.(page, "기본 URL 상태 점검 화면");
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

    result = {
      id: "health-check",
      title: "기본 URL 상태 점검",
      environmentId: environment?.id || "default",
      environmentName: environment?.name || "기본",
      featurePath: "공통",
      suite: "smoke",
      status: "passed",
      durationMs: Date.now() - started,
    };
  } catch (error) {
    await onPreview?.(page, "기본 URL 상태 점검 실패", { previewStatus: "failed" });
    const screenshot = path.join(artifactsDir, "health-check.png");
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    const failure = describeFailure({
      error,
      page,
      failedStep: "기본 URL 상태 점검",
      detectionPointLabel: "기본 URL 상태 점검",
      fallbackUrl: baseUrl
    });
    result = {
      id: "health-check",
      title: "기본 URL 상태 점검",
      environmentId: environment?.id || "default",
      environmentName: environment?.name || "기본",
      featurePath: "공통",
      suite: "smoke",
      status: "failed",
      durationMs: Date.now() - started,
      error: error.message,
      failedStep: failure.failedStep,
      failureReason: failure.failureReason,
      detectionPoint: failure.detectionPoint,
      currentUrl: failure.currentUrl,
      screenshot,
    };
  } finally {
    const videoPath = await closePageWithVideo(page);
    if (result) result.videoPath = videoPath;
  }
  return result;
}

async function runScenario(context, baseUrl, scenario, artifactsDir, onPreview, environment) {
  const started = Date.now();
  const page = await context.newPage();
  let currentStep = null;
  let currentStepIndex = -1;
  let result = null;

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await onPreview?.(page, `${scenario.title} 시작`);
    for (let index = 0; index < scenario.steps.length; index += 1) {
      const step = scenario.steps[index];
      currentStep = step;
      currentStepIndex = index;
      await executeStep(page, baseUrl, step, artifactsDir, scenario.id);
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      await onPreview?.(page, `${scenario.title} · ${formatStepPreview(step)}`);
    }

    result = {
      id: scenario.id,
      title: scenario.title,
      priority: scenario.priority,
      tags: scenario.tags,
      featurePath: scenario.featurePath,
      suite: scenario.suite,
      environmentId: environment?.id || "default",
      environmentName: environment?.name || "기본",
      status: "passed",
      durationMs: Date.now() - started,
    };
  } catch (error) {
    await onPreview?.(page, `${scenario.title} 실패`, { previewStatus: "failed" });
    const safeId = scenario.id.replace(/[^a-z0-9_-]/gi, "-");
    const screenshot = path.join(artifactsDir, `${safeId}.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    const failedStep = currentStep ? formatStepPreview(currentStep) : "시나리오 시작 준비";
    const failure = describeFailure({
      error,
      page,
      failedStep,
      detectionPointLabel: currentStep
        ? `${scenario.title} / 단계 ${currentStepIndex + 1}`
        : `${scenario.title} / 시작 준비`,
      fallbackUrl: baseUrl
    });
    result = {
      id: scenario.id,
      title: scenario.title,
      priority: scenario.priority,
      tags: scenario.tags,
      featurePath: scenario.featurePath,
      suite: scenario.suite,
      environmentId: environment?.id || "default",
      environmentName: environment?.name || "기본",
      status: "failed",
      durationMs: Date.now() - started,
      error: error.message,
      failedStep: failure.failedStep,
      failureReason: failure.failureReason,
      detectionPoint: failure.detectionPoint,
      currentUrl: failure.currentUrl,
      screenshot,
    };
  } finally {
    const videoPath = await closePageWithVideo(page);
    if (result) result.videoPath = videoPath;
  }
  return result;
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
    case "scrollToBottom":
      await scrollToBottom(page);
      return;
    case "expectButtonDisabled":
      await expectButtonState(page, step.target, true);
      return;
    case "expectButtonEnabled":
      await expectButtonState(page, step.target, false);
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

async function scrollToBottom(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)).catch(() => {});
  await page.waitForTimeout(300);
  const scrolledToBottom = await page.evaluate(() => {
    return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
  }).catch(() => false);
  if (!scrolledToBottom) {
    throw new Error("페이지를 끝까지 스크롤하지 못했습니다.");
  }
}

async function expectButtonState(page, text, expectedDisabled) {
  const target = await findClickableTarget(page, text);
  if (!target) {
    throw new Error(`'${text}' 버튼을 찾지 못했습니다.`);
  }

  const disabled = await isDisabled(target);
  if (expectedDisabled && !disabled) {
    throw new Error(`'${text}' 버튼이 비활성화 상태가 아닙니다.`);
  }
  if (!expectedDisabled && disabled) {
    throw new Error(`'${text}' 버튼이 활성화 상태가 아닙니다.`);
  }
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
  const target = await findClickableTarget(page, text);
  if (target) {
    await clickEnabledTarget(target, text);
    return;
  }

  throw new Error(`클릭 대상을 찾지 못했습니다: ${text}`);
}

async function findClickableTarget(page, text) {
  const candidates = [
    page.getByRole("button", { name: text, exact: false }),
    page.getByRole("link", { name: text, exact: false }),
    page.getByText(text, { exact: false })
  ];

  for (const locator of candidates) {
    const target = locator.first();
    if (await target.isVisible().catch(() => false)) {
      return target;
    }
  }

  return null;
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

function describeFailure({ error, page, failedStep, detectionPointLabel, fallbackUrl = "" }) {
  const currentUrl = safePageUrl(page) || fallbackUrl;
  return {
    failedStep,
    currentUrl,
    failureReason: extractFailureReason(error, failedStep),
    detectionPoint: [detectionPointLabel, currentUrl ? `화면 ${currentUrl}` : ""]
      .filter(Boolean)
      .join(" / ")
  };
}

function extractFailureReason(error, failedStep) {
  const message = String(error?.message || "").replace(/\s+/g, " ").trim();
  if (!message) return failedStep ? `${failedStep} 단계에서 실패했습니다.` : "실패 사유를 확인하지 못했습니다.";
  if (/Timeout/i.test(message)) {
    return failedStep
      ? `${failedStep} 단계가 제한 시간 안에 완료되지 않았습니다.`
      : "요청이 제한 시간 안에 완료되지 않았습니다.";
  }
  if (/현재 URL에 .+ 포함되지 않습니다/.test(message)) {
    return "예상한 URL로 이동하지 못했습니다.";
  }
  if (/지원하지 않는 액션/.test(message)) {
    return "시나리오에 지원하지 않는 액션이 포함되어 있습니다.";
  }
  if (/strict mode|locator|selector|Element is not attached|No node found/i.test(message)) {
    return failedStep
      ? `${failedStep} 단계에서 필요한 요소를 찾지 못했습니다.`
      : "필요한 요소를 찾지 못했습니다.";
  }
  return message;
}

function safePageUrl(page) {
  try {
    return typeof page?.url === "function" ? page.url() : "";
  } catch {
    return "";
  }
}

async function closePageWithVideo(page) {
  const video = typeof page?.video === "function" ? page.video() : null;
  await page.close().catch(() => {});
  if (!video || typeof video.path !== "function") return null;
  try {
    return await video.path();
  } catch {
    return null;
  }
}

module.exports = {
  runAutoQa,
  validateScenarioExecutability,
  normalizeUrl,
  resolveTarget,
  __test__: {
    collectRunVideos,
    downloadByClick,
  }
};
