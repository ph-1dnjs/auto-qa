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
    APPLE_API_KEY,
    APPLE_API_KEY_ID,
    APPLE_API_ISSUER,
    CSC_NAME,
  } = process.env;
  const requireNotarization = process.env.AUTOQA_REQUIRE_NOTARIZATION === "1";
  const hasAppleIdAuth = Boolean(APPLE_ID && APPLE_APP_SPECIFIC_PASSWORD && APPLE_TEAM_ID);
  const hasApiKeyAuth = Boolean(APPLE_API_KEY && APPLE_API_KEY_ID && APPLE_API_ISSUER);

  if (!hasAppleIdAuth && !hasApiKeyAuth) {
    const message = "[notarize] Apple ID auth or App Store Connect API key auth is required.";
    if (requireNotarization) throw new Error(`${message} Refusing to publish a non-notarized mac build.`);
    console.log(`${message} Skipping notarization.`);
    return;
  }

  if (CSC_NAME && !/Developer ID Application/i.test(CSC_NAME)) {
    const message = `[notarize] CSC_NAME is not a Developer ID Application certificate: ${CSC_NAME}`;
    if (requireNotarization) throw new Error(`${message}. Refusing to publish a non-notarized mac build.`);
    console.log(message);
    console.log("[notarize] External macOS distribution requires Developer ID Application signing. Skipping notarization.");
    return;
  }

  const productFilename = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${productFilename}.app`);

  console.log(`[notarize] Starting notarization for ${appPath}`);

  const notarizeOptions = {
    appBundleId: packager.appInfo.id,
    appPath,
  };

  if (hasApiKeyAuth) {
    notarizeOptions.appleApiKey = APPLE_API_KEY;
    notarizeOptions.appleApiKeyId = APPLE_API_KEY_ID;
    notarizeOptions.appleApiIssuer = APPLE_API_ISSUER;
  } else {
    notarizeOptions.appleId = APPLE_ID;
    notarizeOptions.appleIdPassword = APPLE_APP_SPECIFIC_PASSWORD;
    notarizeOptions.teamId = APPLE_TEAM_ID;
  }

  await notarize(notarizeOptions);

  console.log("[notarize] Notarization completed.");
};
