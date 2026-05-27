const fs = require("node:fs/promises");
const path = require("node:path");

function buildFailureRecords(summary, results) {
  return (Array.isArray(results) ? results : [])
    .filter((result) => result?.status === "failed")
    .map((result, index) => ({
      index: index + 1,
      runId: summary?.runId || "",
      startedAt: summary?.startedAt || "",
      environmentName: result.environmentName || "기본",
      featurePath: result.featurePath || "공통",
      suite: result.suite || "",
      scenarioTitle: result.title || "",
      failedStep: result.failedStep || "",
      failureReason: result.failureReason || result.error || "",
      detectionPoint: result.detectionPoint || "",
      currentUrl: result.currentUrl || "",
      screenshot: result.screenshot || "",
      error: result.error || "",
      tags: Array.isArray(result.tags) ? result.tags.join(", ") : "",
    }));
}

function renderFailureMarkdown(summary, records) {
  const lines = [
    "# AutoQA 실패 시나리오 내보내기",
    "",
    `- 실행 ID: ${summary?.runId || "-"}`,
    `- 실행 시각: ${summary?.startedAt || "-"}`,
    `- 실패 개수: ${records.length}`,
    "",
  ];

  if (!records.length) {
    lines.push("실패한 시나리오가 없습니다.", "");
    return lines.join("\n");
  }

  for (const record of records) {
    lines.push(`## ${record.index}. ${record.scenarioTitle || "이름 없는 시나리오"}`);
    lines.push(`- 환경: ${record.environmentName}`);
    lines.push(`- Feature: ${record.featurePath}`);
    lines.push(`- Suite: ${record.suite || "-"}`);
    lines.push(`- 태그: ${record.tags || "-"}`);
    lines.push(`- 실패 사유: ${record.failureReason || "-"}`);
    lines.push(`- 발견 지점: ${record.detectionPoint || "-"}`);
    lines.push(`- 실패 단계: ${record.failedStep || "-"}`);
    lines.push(`- 현재 URL: ${record.currentUrl || "-"}`);
    lines.push(`- 스크린샷: ${record.screenshot || "-"}`);
    lines.push(`- 원본 오류: ${record.error || "-"}`);
    if (record.screenshotMarkdown) {
      lines.push("");
      lines.push(record.screenshotMarkdown);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderFailureCsv(records) {
  const headers = [
    "번호",
    "환경",
    "Feature",
    "Suite",
    "시나리오",
    "실패 단계",
    "실패 사유",
    "발견 지점",
    "현재 URL",
    "스크린샷",
    "태그",
    "원본 오류",
  ];
  const rows = records.map((record) => ([
    record.index,
    record.environmentName,
    record.featurePath,
    record.suite,
    record.scenarioTitle,
    record.failedStep,
    record.failureReason,
    record.detectionPoint,
    record.currentUrl,
    record.screenshot,
    record.tags,
    record.error,
  ]));

  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n")}\n`;
}

async function writeFailureExport({ summary, results, format, filePath }) {
  const records = buildFailureRecords(summary, results);
  const exportRecords = format === "md"
    ? await prepareMarkdownAssets(records, filePath)
    : records;
  const content = format === "md"
    ? renderFailureMarkdown(summary, exportRecords)
    : renderFailureCsv(exportRecords);
  await fs.writeFile(filePath, content, "utf8");
  return { filePath, count: exportRecords.length };
}

function getFailureExportDefaultName(summary, format) {
  const runId = sanitizeFileName(summary?.runId || `run-${Date.now()}`);
  const ext = format === "md" ? "md" : "csv";
  return `${runId}-failures.${ext}`;
}

function escapeCsvCell(value) {
  const normalized = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

function sanitizeFileName(value) {
  return String(value || "autoqa")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function prepareMarkdownAssets(records, markdownPath) {
  const assetDir = path.join(
    path.dirname(markdownPath),
    `${path.basename(markdownPath, path.extname(markdownPath))}-assets`
  );
  let assetDirCreated = false;

  const prepared = [];
  for (const record of records) {
    if (!record.screenshot) {
      prepared.push(record);
      continue;
    }

    try {
      if (!assetDirCreated) {
        await fs.mkdir(assetDir, { recursive: true });
        assetDirCreated = true;
      }
      const ext = path.extname(record.screenshot) || ".png";
      const fileName = `${String(record.index).padStart(2, "0")}-${sanitizeFileName(record.scenarioTitle || "failure")}${ext}`;
      const targetPath = path.join(assetDir, fileName);
      await fs.copyFile(record.screenshot, targetPath);
      prepared.push({
        ...record,
        screenshot: path.relative(path.dirname(markdownPath), targetPath).replace(/\\/g, "/"),
        screenshotMarkdown: `![${record.scenarioTitle || "실패 스크린샷"}](${path.relative(path.dirname(markdownPath), targetPath).replace(/\\/g, "/")})`
      });
    } catch {
      prepared.push(record);
    }
  }

  return prepared;
}

module.exports = {
  buildFailureRecords,
  renderFailureMarkdown,
  renderFailureCsv,
  writeFailureExport,
  getFailureExportDefaultName,
};
