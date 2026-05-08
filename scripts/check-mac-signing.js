"use strict";

const { execSync } = require("node:child_process");

const required = ["CSC_NAME"];

let missingCount = 0;

for (const name of required) {
  const value = process.env[name];
  if (!value) {
    missingCount += 1;
    console.log(`${name}: missing`);
    continue;
  }

  if (name === "APPLE_APP_SPECIFIC_PASSWORD") {
    console.log(`${name}: set`);
    continue;
  }

  console.log(`${name}: ${value}`);
}

const hasAppleIdAuth = Boolean(
  process.env.APPLE_ID
  && process.env.APPLE_APP_SPECIFIC_PASSWORD
  && process.env.APPLE_TEAM_ID,
);
const hasApiKeyAuth = Boolean(
  process.env.APPLE_API_KEY
  && process.env.APPLE_API_KEY_ID
  && process.env.APPLE_API_ISSUER,
);

console.log(`APPLE_ID auth: ${hasAppleIdAuth ? "set" : "missing"}`);
console.log(`App Store Connect API key auth: ${hasApiKeyAuth ? "set" : "missing"}`);

if (!hasAppleIdAuth && !hasApiKeyAuth) {
  missingCount += 1;
  console.log("notarization auth: missing");
}

if (process.env.CSC_NAME && !/Developer ID Application/i.test(process.env.CSC_NAME)) {
  console.log("CSC_NAME warning: external macOS distribution requires a 'Developer ID Application' certificate.");
  process.exitCode = 1;
}

let identities = "";
try {
  identities = execSync("security find-identity -v -p codesigning", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  identities = String(error.stdout || "");
}

const developerIdLines = identities
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /Developer ID Application:/i.test(line));

if (developerIdLines.length === 0) {
  console.log("Developer ID Application certificate: missing");
  missingCount += 1;
} else {
  console.log("Developer ID Application certificate:");
  for (const line of developerIdLines) console.log(`  ${line}`);
}

if (missingCount > 0) {
  console.log("");
  console.log("Set the missing variables before running npm run publish:mac.");
  process.exitCode = 1;
}
