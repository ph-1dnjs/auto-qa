const { parseScenarioText } = require("./parser");

function prepareScenarios(input) {
  const scenarios = parseScenarioText(input);
  return scenarios.map((scenario, index) => normalizeScenario(scenario, index));
}

function normalizeScenario(scenario, index) {
  const tags = Array.isArray(scenario.tags)
    ? scenario.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const featurePath = normalizeFeaturePath(scenario.feature || scenario.featurePath || inferFeaturePath(tags));
  const suite = normalizeSuite(scenario.suite || inferSuiteFromTags(tags));

  return {
    ...scenario,
    id: scenario.id || `scenario-${index + 1}`,
    priority: scenario.priority || "Medium",
    tags,
    featurePath,
    suite,
    steps: Array.isArray(scenario.steps) ? scenario.steps : []
  };
}

function normalizeFeaturePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "공통";
  return raw
    .split(/[/>]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function inferFeaturePath(tags) {
  if (!Array.isArray(tags) || !tags.length) return "공통";
  const [first] = tags;
  if (!first) return "공통";
  return String(first).includes("/") ? String(first) : `기본/${first}`;
}

function inferSuiteFromTags(tags) {
  if (!Array.isArray(tags)) return "custom";
  const hit = tags.find((tag) => ["smoke", "full", "regression", "edge"].includes(String(tag).toLowerCase()));
  return hit || "custom";
}

function normalizeSuite(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "custom";
  if (["smoke", "full", "regression", "edge"].includes(raw)) return raw;
  return raw;
}

function filterScenarios(scenarios, selection = {}) {
  const featurePath = normalizeFeaturePath(selection.featurePath || "");
  const hasFeatureFilter = Boolean(String(selection.featurePath || "").trim());
  const suite = String(selection.suite || "").trim().toLowerCase();
  const allowedIds = new Set(Array.isArray(selection.scenarioIds) ? selection.scenarioIds : []);

  return scenarios.filter((scenario) => {
    if (hasFeatureFilter) {
      const matchesFeature = scenario.featurePath === featurePath
        || scenario.featurePath.startsWith(`${featurePath}/`);
      if (!matchesFeature) return false;
    }

    if (suite && suite !== "all" && scenario.suite !== suite) return false;
    if (allowedIds.size > 0 && !allowedIds.has(scenario.id)) return false;
    return true;
  });
}

function buildFeatureMap(scenarios) {
  const nodes = new Map();

  for (const scenario of scenarios) {
    const parts = scenario.featurePath.split("/").filter(Boolean);
    let path = "";
    for (let index = 0; index < parts.length; index += 1) {
      path = path ? `${path}/${parts[index]}` : parts[index];
      const current = nodes.get(path) || createEmptyNode(path, index, index > 0 ? parts.slice(0, index).join("/") : "");
      current.scenarioCount += 1;
      current.suites[scenario.suite] = (current.suites[scenario.suite] || 0) + 1;
      nodes.set(path, current);
    }
  }

  return Array.from(nodes.values()).sort((left, right) => left.path.localeCompare(right.path, "ko"));
}

function createEmptyNode(path, depth, parentPath) {
  const segments = path.split("/");
  return {
    path,
    depth,
    name: segments.at(-1) || path,
    parentPath,
    scenarioCount: 0,
    suites: {}
  };
}

function analyzeImpact(scenarios, changedText) {
  const tokens = tokenize(changedText);
  if (!tokens.length) {
    return { tokens: [], matches: [], summary: "변경 파일 또는 키워드를 입력하면 영향 범위를 추천합니다." };
  }

  const matches = scenarios
    .map((scenario) => scoreScenarioImpact(scenario, tokens))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "ko"))
    .slice(0, 12);

  return {
    tokens,
    matches,
    summary: matches.length
      ? `영향 가능성이 높은 시나리오 ${matches.length}개를 선별했습니다.`
      : "일치하는 시나리오를 찾지 못했습니다."
  };
}

function scoreScenarioImpact(scenario, tokens) {
  const searchText = [
    scenario.title,
    scenario.featurePath,
    scenario.suite,
    ...(scenario.tags || []),
    ...(scenario.steps || []).flatMap((step) => [step.action, step.target, step.value]),
  ]
    .join(" ")
    .toLowerCase();

  const matchedTokens = [];
  let score = 0;
  for (const token of tokens) {
    if (!searchText.includes(token)) continue;
    matchedTokens.push(token);
    score += token.length >= 5 ? 3 : 2;
    if (scenario.featurePath.toLowerCase().includes(token)) score += 2;
    if ((scenario.tags || []).some((tag) => String(tag).toLowerCase().includes(token))) score += 2;
  }

  return {
    id: scenario.id,
    title: scenario.title,
    featurePath: scenario.featurePath,
    suite: scenario.suite,
    score,
    reasons: matchedTokens.slice(0, 4)
  };
}

function tokenize(input) {
  return Array.from(new Set(
    String(input || "")
      .toLowerCase()
      .split(/[^a-z0-9가-힣/_-]+/)
      .flatMap((chunk) => chunk.split(/[\/_-]+/))
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  ));
}

module.exports = {
  analyzeImpact,
  buildFeatureMap,
  filterScenarios,
  normalizeFeaturePath,
  normalizeSuite,
  prepareScenarios,
  tokenize
};
