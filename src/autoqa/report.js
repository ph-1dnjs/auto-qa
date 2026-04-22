const fs = require("node:fs/promises");
const path = require("node:path");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writeReports({ summary, results, artifactsDir }) {
  const jsonPath = path.join(artifactsDir, "report.json");
  const htmlPath = path.join(artifactsDir, "report.html");

  await fs.writeFile(jsonPath, JSON.stringify({ summary, results }, null, 2), "utf8");
  await fs.writeFile(htmlPath, renderHtml(summary, results), "utf8");

  return { jsonPath, htmlPath };
}

function renderHtml(summary, results) {
  const rows = results
    .map((result) => {
      const screenshot = result.screenshot
        ? `<a href="${escapeHtml(path.basename(result.screenshot))}">스크린샷</a>`
        : "-";
      return `<tr>
        <td>${escapeHtml(result.title)}</td>
        <td><span class="pill ${result.status}">${escapeHtml(result.status)}</span></td>
        <td>${escapeHtml(result.durationMs)}ms</td>
        <td>${escapeHtml(result.error || "")}</td>
        <td>${screenshot}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AutoQA Report</title>
  <style>
    body { margin: 0; background: #f5f7fb; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 24px; }
    h1 { margin: 0 0 4px; font-size: 30px; }
    .sub { color: #667085; margin: 0 0 24px; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat { background: #fff; border: 1px solid #dde3ee; border-radius: 8px; padding: 16px; }
    .label { color: #667085; font-size: 13px; }
    .value { font-size: 26px; font-weight: 700; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #dde3ee; border-radius: 8px; overflow: hidden; }
    th, td { border-bottom: 1px solid #e7ebf2; padding: 12px; text-align: left; vertical-align: top; font-size: 14px; }
    th { background: #eef3fb; color: #344054; }
    tr:last-child td { border-bottom: 0; }
    .pill { display: inline-block; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
    .passed { background: #dcfce7; color: #166534; }
    .failed { background: #fee2e2; color: #991b1b; }
    .skipped { background: #fef3c7; color: #92400e; }
    @media (max-width: 760px) { .stats { grid-template-columns: 1fr 1fr; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <main>
    <h1>AutoQA Report</h1>
    <p class="sub">${escapeHtml(summary.baseUrl)} · ${escapeHtml(summary.startedAt)}</p>
    <section class="stats">
      <div class="stat"><div class="label">전체</div><div class="value">${summary.total}</div></div>
      <div class="stat"><div class="label">통과</div><div class="value">${summary.passed}</div></div>
      <div class="stat"><div class="label">실패</div><div class="value">${summary.failed}</div></div>
      <div class="stat"><div class="label">소요시간</div><div class="value">${summary.durationMs}ms</div></div>
    </section>
    <table>
      <thead><tr><th>시나리오</th><th>상태</th><th>시간</th><th>오류</th><th>증거</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

module.exports = {
  writeReports
};
