"use strict";

const path = require("node:path");
const { notarize } = require("@electron/notarize");

module.exports = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== "darwin") return;

  const {
    APPLE_ID,
    APPLE_APP_SPECIFIC_PASSWORD,
    APPLE_TEAM_ID,
    CSC_NAME,
  } = process.env;

  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log("[notarize] APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set. Skipping notarization.");
    return;
  }

  if (CSC_NAME && !/Developer ID Application/i.test(CSC_NAME)) {
    console.log(`[notarize] CSC_NAME is not a Developer ID Application certificate: ${CSC_NAME}`);
    console.log("[notarize] External macOS distribution requires Developer ID Application signing. Skipping notarization.");
    return;
  }

  const productFilename = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${productFilename}.app`);

  console.log(`[notarize] Starting notarization for ${appPath}`);

  await notarize({
    appBundleId: packager.appInfo.id,
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });

  console.log("[notarize] Notarization completed.");
};
