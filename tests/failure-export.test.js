const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFailureRecords,
  renderFailureMarkdown,
  renderFailureCsv,
} = require("../src/autoqa/failure-export");

test("builds failure records with jira-friendly fields", () => {
  const records = buildFailureRecords(
    { runId: "run-123", startedAt: "2026-05-27T10:00:00.000Z" },
    [
      {
        status: "passed",
        title: "성공 시나리오",
      },
      {
        status: "failed",
        title: "로그인 실패",
        environmentName: "스테이징",
        featurePath: "인증/로그인",
        suite: "smoke",
        failedStep: "로그인 버튼 클릭",
        failureReason: "로그인 버튼 클릭 단계에서 필요한 요소를 찾지 못했습니다.",
        detectionPoint: "로그인 실패 / 단계 2 / 화면 https://example.com/login",
        currentUrl: "https://example.com/login",
        screenshot: "/tmp/login.png",
        error: "locator timeout",
        tags: ["auth", "critical"],
      },
    ]
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].scenarioTitle, "로그인 실패");
  assert.equal(records[0].failureReason, "로그인 버튼 클릭 단계에서 필요한 요소를 찾지 못했습니다.");
  assert.equal(records[0].detectionPoint, "로그인 실패 / 단계 2 / 화면 https://example.com/login");
  assert.equal(records[0].tags, "auth, critical");
});

test("renders markdown and csv exports with failure reason and detection point", () => {
  const summary = { runId: "run-456", startedAt: "2026-05-27T10:10:00.000Z" };
  const records = buildFailureRecords(summary, [
    {
      status: "failed",
      title: "결제 실패",
      environmentName: "운영 반영 전",
      featurePath: "결제/카드",
      suite: "regression",
      failedStep: "결제 버튼 클릭",
      failureReason: "예상한 URL로 이동하지 못했습니다.",
      detectionPoint: "결제 실패 / 단계 4 / 화면 https://example.com/pay",
      currentUrl: "https://example.com/pay",
      screenshot: "screenshots/payment-failure.png",
      error: "현재 URL에 '/complete'가 포함되지 않습니다.",
    },
  ]).map((record) => ({
    ...record,
    screenshotMarkdown: "![결제 실패](screenshots/payment-failure.png)"
  }));

  const markdown = renderFailureMarkdown(summary, records);
  const csv = renderFailureCsv(records);

  assert.match(markdown, /실패 사유: 예상한 URL로 이동하지 못했습니다\./);
  assert.match(markdown, /발견 지점: 결제 실패 \/ 단계 4 \/ 화면 https:\/\/example\.com\/pay/);
  assert.match(markdown, /!\[결제 실패\]\(screenshots\/payment-failure\.png\)/);
  assert.match(csv, /"실패 사유"/);
  assert.match(csv, /"예상한 URL로 이동하지 못했습니다\."/);
});
