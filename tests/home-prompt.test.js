const test = require("node:test");
const assert = require("node:assert/strict");

test("matches home commands with or without a leading slash", async () => {
  const {
    resolveHomePromptCommand,
  } = await import("../src/renderer/shared/lib/home-prompt.mjs");

  const commands = [
    { command: "/시나리오", aliases: ["/scenario", "시나리오", "scenario"] },
    { command: "/실행", aliases: ["/qa", "/run", "실행", "qa", "run"] },
  ];

  assert.equal(resolveHomePromptCommand(commands, "/시나리오")?.command, "/시나리오");
  assert.equal(resolveHomePromptCommand(commands, "시나리오")?.command, "/시나리오");
  assert.equal(resolveHomePromptCommand(commands, "run")?.command, "/실행");
});

test("filters command suggestions for bare keywords", async () => {
  const {
    getFilteredHomePromptCommands,
    shouldSuggestHomePromptCommands,
  } = await import("../src/renderer/shared/lib/home-prompt.mjs");

  const commands = [
    {
      command: "/시나리오",
      aliases: ["/scenario", "시나리오", "scenario"],
      title: "시나리오 워크스페이스",
      description: "시나리오 작성 화면으로 이동합니다.",
      keywords: ["시나리오", "scenario", "extract"],
    },
    {
      command: "/실행",
      aliases: ["/qa", "/run", "실행", "qa", "run"],
      title: "실행 콘솔",
      description: "QA 실행 화면으로 이동합니다.",
      keywords: ["실행", "qa", "run"],
    },
  ];

  assert.deepEqual(
    getFilteredHomePromptCommands(commands, "시").map((command) => command.command),
    ["/시나리오"],
  );
  assert.equal(shouldSuggestHomePromptCommands(commands, "run"), true);
  assert.equal(shouldSuggestHomePromptCommands(commands, "example.com"), false);
});

test("normalizes only likely http urls", async () => {
  const { normalizeHomePromptUrl } = await import("../src/renderer/shared/lib/home-prompt.mjs");

  assert.equal(normalizeHomePromptUrl("example.com"), "https://example.com/");
  assert.equal(normalizeHomePromptUrl("localhost:3000"), "https://localhost:3000/");
  assert.equal(normalizeHomePromptUrl("https://example.com/login"), "https://example.com/login");
  assert.equal(normalizeHomePromptUrl("실행"), null);
  assert.equal(normalizeHomePromptUrl("scenario"), null);
});

test("filters saved urls for partial home input", async () => {
  const { getFilteredHomePromptUrls } = await import("../src/renderer/shared/lib/home-prompt.mjs");

  const history = [
    { url: "https://example.com/login", savedAt: 1 },
    { url: "https://staging.example.com/orders", savedAt: 2 },
    { url: "https://internal.example.org/dashboard", savedAt: 3 },
  ];

  assert.deepEqual(
    getFilteredHomePromptUrls(history, "staging").map((item) => item.url),
    ["https://staging.example.com/orders"],
  );
  assert.deepEqual(
    getFilteredHomePromptUrls(history, "example.com").map((item) => item.url),
    ["https://example.com/login", "https://staging.example.com/orders"],
  );
  assert.deepEqual(getFilteredHomePromptUrls(history, ""), []);
});
