const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseScenarioText, parseNaturalLanguageStep } = require("../src/autoqa/parser");
const {
  __test__,
  normalizeUrl,
  resolveTarget,
  validateScenarioExecutability
} = require("../src/autoqa/runner");

test("parses Korean markdown scenario", () => {
  const scenarios = parseScenarioText(`# 시나리오: 사용자 로그인
priority: Critical
tags: [auth, smoke]

Given /login 페이지로 이동한다
When 이메일을 'user@test.com' 으로 입력한다
And 로그인 버튼을 클릭한다
Then URL에 '/dashboard' 가 포함된다`);

  assert.equal(scenarios.length, 1);
  assert.equal(scenarios[0].title, "사용자 로그인");
  assert.equal(scenarios[0].priority, "Critical");
  assert.deepEqual(scenarios[0].tags, ["auth", "smoke"]);
  assert.deepEqual(scenarios[0].steps[0], { action: "goto", target: "/login" });
  assert.deepEqual(scenarios[0].steps[1], {
    action: "fill",
    target: "이메일",
    value: "user@test.com"
  });
});

test("parses common natural language steps", () => {
  assert.deepEqual(parseNaturalLanguageStep("3초 기다린다"), { action: "wait", value: 3000 });
  assert.deepEqual(parseNaturalLanguageStep("저장 버튼을 클릭한다"), {
    action: "click",
    target: "저장"
  });
  assert.deepEqual(parseNaturalLanguageStep("대시보드 텍스트가 보인다"), {
    action: "expectText",
    target: "대시보드"
  });
  assert.deepEqual(parseNaturalLanguageStep("상품 유형에서 '일반' 을 선택한다"), {
    action: "select",
    target: "상품 유형",
    value: "일반"
  });
  assert.deepEqual(parseNaturalLanguageStep("파일 다운로드 버튼을 클릭하여 다운로드한다"), {
    action: "download",
    target: "파일 다운로드"
  });
  assert.deepEqual(parseNaturalLanguageStep("페이지를 끝까지 스크롤한다"), {
    action: "scrollToBottom"
  });
  assert.deepEqual(parseNaturalLanguageStep("전자서명 버튼이 비활성화 상태다"), {
    action: "expectButtonDisabled",
    target: "전자서명"
  });
  assert.deepEqual(parseNaturalLanguageStep("전자서명 버튼이 활성화 상태다"), {
    action: "expectButtonEnabled",
    target: "전자서명"
  });
  assert.deepEqual(parseNaturalLanguageStep("로그인 탭을 클릭한다"), {
    action: "click",
    target: "로그인"
  });
  assert.deepEqual(parseNaturalLanguageStep("검색어에 '리쥬란' 입력한다"), {
    action: "fill",
    target: "검색어",
    value: "리쥬란"
  });
  assert.deepEqual(parseNaturalLanguageStep("/login 화면에 진입한다"), {
    action: "goto",
    target: "/login"
  });
  assert.deepEqual(parseNaturalLanguageStep("거래약정서 텍스트가 표시된다"), {
    action: "expectText",
    target: "거래약정서"
  });
});

test("normalizes and resolves URLs", () => {
  assert.equal(normalizeUrl("example.com"), "https://example.com");
  assert.equal(resolveTarget("https://example.com/app", "/login"), "https://example.com/login");
});

test("rejects imported scenarios that contain only note steps", () => {
  assert.throws(() => validateScenarioExecutability([
    {
      title: "거래약정서 정상 조회",
      steps: [
        { action: "note", target: "승인 완료 계정으로 로그인" },
        { action: "note", target: "최초 로그인 후 화면 확인" }
      ]
    }
  ]), /실행 가능한 QA 단계가 없습니다/);
});

test("rejects scenarios that have assertions only without any interactive step", () => {
  assert.throws(() => validateScenarioExecutability([
    {
      title: "거래약정서 정상 조회",
      steps: [
        { action: "expectText", target: "거래약정서" },
        { action: "expectButtonDisabled", target: "전자서명" }
      ]
    }
  ]), /실제로 진행할 액션 단계가 없습니다/);
});

test("download step clicks the target and saves the downloaded file", async () => {
  const actions = [];
  let saveAsPath = "";
  const download = {
    suggestedFilename: () => "report.xlsx",
    saveAs: async (targetPath) => {
      saveAsPath = targetPath;
      fs.writeFileSync(targetPath, "downloaded");
    }
  };
  const createLocator = (name, visible) => ({
    first: () => ({
      isVisible: async () => {
        actions.push(["isVisible", name]);
        return visible;
      },
      evaluate: async () => false,
      click: async () => {
        actions.push(["click", name]);
      },
      page: () => ({
        waitForLoadState: async (_state, options) => {
          actions.push(["waitForLoadState", options?.timeout]);
        },
        waitForTimeout: async (timeout) => {
          actions.push(["waitForTimeout", timeout]);
        }
      })
    })
  });
  const page = {
    waitForEvent: async (eventName, options) => {
      actions.push(["waitForEvent", eventName, options?.timeout]);
      return download;
    },
    getByRole: (role, { name }) => createLocator(`${role}:${name}`, role === "button"),
    getByText: (name) => createLocator(`text:${name}`, false)
  };
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-download-test-"));

  await __test__.downloadByClick(page, "엑셀 다운로드", artifactsDir, "scenario-1");

  assert.deepEqual(actions, [
    ["waitForEvent", "download", 15000],
    ["isVisible", "button:엑셀 다운로드"],
    ["click", "button:엑셀 다운로드"],
    ["waitForLoadState", 5000],
    ["waitForTimeout", 300]
  ]);
  assert.equal(saveAsPath, path.join(artifactsDir, "report.xlsx"));
  assert.equal(fs.readFileSync(saveAsPath, "utf8"), "downloaded");
});

test("download step falls back to scenario id when suggested filename is missing", async () => {
  let savedPath = "";
  const download = {
    suggestedFilename: () => "",
    saveAs: async (targetPath) => {
      savedPath = targetPath;
    }
  };
  const createLocator = (visible) => ({
    first: () => ({
      isVisible: async () => visible,
      evaluate: async () => false,
      click: async () => {},
      page: () => ({
        waitForLoadState: async () => {},
        waitForTimeout: async () => {}
      })
    })
  });
  const page = {
    waitForEvent: async () => download,
    getByRole: (role) => createLocator(role === "button"),
    getByText: () => createLocator(false)
  };
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-download-fallback-"));

  await __test__.downloadByClick(page, "다운로드", artifactsDir, "scenario-download");

  assert.equal(savedPath, path.join(artifactsDir, "scenario-download.xlsx"));
});

test("collectRunVideos extracts only results that have recorded videos", () => {
  const videos = __test__.collectRunVideos([
    { title: "기본 URL 상태 점검", status: "passed", videoPath: "/tmp/health.webm" },
    { title: "로그인 시나리오", status: "failed", videoPath: "/tmp/login.webm" },
    { title: "장바구니 시나리오", status: "passed" },
  ]);

  assert.deepEqual(videos, [
    {
      index: 1,
      title: "기본 URL 상태 점검",
      status: "passed",
      filePath: "/tmp/health.webm",
    },
    {
      index: 2,
      title: "로그인 시나리오",
      status: "failed",
      filePath: "/tmp/login.webm",
    },
  ]);
});
