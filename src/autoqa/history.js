const fs = require("node:fs/promises");
const path = require("node:path");

const HISTORY_LIMIT = 30;

async function loadHistory(historyFilePath) {
  try {
    const raw = await fs.readFile(historyFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function appendHistory(historyFilePath, runResult) {
  const history = await loadHistory(historyFilePath);
  const entry = {
    id: runResult.summary.runId,
    createdAt: new Date().toISOString(),
    summary: {
      baseUrl: runResult.summary.baseUrl,
      total: runResult.summary.total,
      passed: runResult.summary.passed,
      failed: runResult.summary.failed,
      durationMs: runResult.summary.durationMs,
      scenarioTotal: runResult.summary.scenarioTotal,
      scenarioPassed: runResult.summary.scenarioPassed,
      scenarioFailed: runResult.summary.scenarioFailed,
      environmentCount: runResult.summary.environmentCount || 1
    },
    environments: Array.isArray(runResult.summary.environments)
      ? runResult.summary.environments.map((environment) => ({
        name: environment.name,
        baseUrl: environment.baseUrl,
        total: environment.total,
        passed: environment.passed,
        failed: environment.failed
      }))
      : [],
    results: (runResult.results || []).map((result) => ({
      title: result.title,
      status: result.status,
      featurePath: result.featurePath || "공통",
      environmentName: result.environmentName || "기본",
    })),
    reports: runResult.reports
  };

  const next = [entry, ...history].slice(0, HISTORY_LIMIT);
  await fs.mkdir(path.dirname(historyFilePath), { recursive: true });
  await fs.writeFile(historyFilePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function summarizeHistory(history) {
  const recent = history.slice(0, 8);
  const totals = {
    runCount: history.length,
    averagePassRate: history.length
      ? Math.round(history.reduce((sum, item) => sum + calculatePassRate(item.summary), 0) / history.length)
      : 0,
  };

  const hotspots = new Map();
  const regressionSet = new Set();

  for (let index = 0; index < history.length; index += 1) {
    const run = history[index];
    for (const result of run.results || []) {
      if (result.status !== "failed") continue;
      const key = `${result.featurePath}::${result.title}`;
      const current = hotspots.get(key) || {
        title: result.title,
        featurePath: result.featurePath,
        failures: 0
      };
      current.failures += 1;
      hotspots.set(key, current);

      const previousPassed = history
        .slice(index + 1)
        .some((item) => (item.results || []).some((entry) =>
          entry.title === result.title
          && entry.featurePath === result.featurePath
          && entry.status === "passed"));
      if (previousPassed) {
        regressionSet.add(key);
      }
    }
  }

  return {
    totals,
    recentRuns: recent.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      passRate: calculatePassRate(item.summary),
      durationMs: item.summary.durationMs,
      failed: item.summary.failed,
      environmentCount: item.summary.environmentCount || 1
    })),
    hotspots: Array.from(hotspots.values())
      .sort((left, right) => right.failures - left.failures)
      .slice(0, 5),
    regressions: regressionSet.size
  };
}

function calculatePassRate(summary = {}) {
  const total = Number(summary.total || 0);
  if (!total) return 0;
  return Math.round((Number(summary.passed || 0) / total) * 100);
}

module.exports = {
  appendHistory,
  loadHistory,
  summarizeHistory
};
