const test = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeImpact,
  buildFeatureMap,
  filterScenarios,
  prepareScenarios
} = require("../src/autoqa/planner");

test("prepares scenarios with feature and suite metadata", () => {
  const scenarios = prepareScenarios(`# 시나리오: 로그인 확인
feature: 인증/로그인
suite: smoke
tags: [auth, smoke]

Given /login 페이지로 이동한다
Then 로그인 텍스트가 보인다`);

  assert.equal(scenarios[0].featurePath, "인증/로그인");
  assert.equal(scenarios[0].suite, "smoke");
});

test("filters scenarios by feature subtree and suite", () => {
  const scenarios = prepareScenarios(`# 시나리오: 로그인
feature: 인증/로그인
suite: smoke

Given /login 페이지로 이동한다

# 시나리오: 프로필
feature: 설정/프로필
suite: full

Given /settings 페이지로 이동한다`);

  const filtered = filterScenarios(scenarios, {
    featurePath: "인증",
    suite: "smoke"
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, "로그인");
});

test("builds feature map and impact recommendations", () => {
  const scenarios = prepareScenarios(`# 시나리오: 대시보드 위젯
feature: 대시보드/위젯
suite: regression
tags: [dashboard, widget]

Given /dashboard 페이지로 이동한다
Then 위젯 텍스트가 보인다`);

  const features = buildFeatureMap(scenarios);
  assert.equal(features[0].path, "대시보드");
  assert.equal(features[1].path, "대시보드/위젯");

  const impact = analyzeImpact(scenarios, "src/pages/dashboard/widget.tsx");
  assert.equal(impact.matches.length, 1);
  assert.equal(impact.matches[0].title, "대시보드 위젯");
});
