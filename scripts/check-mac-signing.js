"use strict";

const required = [
  "APPLE_ID",
  "APPLE_APP_SPECIFIC_PASSWORD",
  "APPLE_TEAM_ID",
  "CSC_NAME",
];

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

if (process.env.CSC_NAME && !/Developer ID Application/i.test(process.env.CSC_NAME)) {
  console.log("warning: CSC_NAME should point to a 'Developer ID Application' certificate for external macOS distribution.");
}

if (missingCount > 0) {
  console.log("");
  console.log("Set the missing variables before running npm run publish:mac.");
  process.exitCode = 1;
}
