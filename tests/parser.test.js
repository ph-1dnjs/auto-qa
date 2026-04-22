const test = require("node:test");
const assert = require("node:assert/strict");
const { parseScenarioText, parseNaturalLanguageStep } = require("../src/autoqa/parser");
const { normalizeUrl, resolveTarget } = require("../src/autoqa/runner");

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
});

test("normalizes and resolves URLs", () => {
  assert.equal(normalizeUrl("example.com"), "https://example.com");
  assert.equal(resolveTarget("https://example.com/app", "/login"), "https://example.com/login");
});
