const { spawnSync } = require("node:child_process");
const path = require("node:path");

const cli = path.join(__dirname, "..", "node_modules", "playwright", "cli.js");
const result = spawnSync(process.execPath, [cli, "install", "chromium"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: "0"
  }
});

process.exit(result.status ?? 1);
