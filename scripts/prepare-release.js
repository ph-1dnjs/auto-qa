const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.join(__dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const docsDir = path.join(rootDir, "docs");

const nextVersion = process.argv[2];
if (!nextVersion) {
  console.error("Usage: node scripts/prepare-release.js <version>");
  process.exit(1);
}

validateVersion(nextVersion);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const previousVersion = packageJson.version;

execFileSync("npm", ["version", nextVersion, "--no-git-tag-version"], {
  cwd: rootDir,
  stdio: "inherit",
});

const releaseNotesPath = path.join(docsDir, `release-notes-${nextVersion}.md`);
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(
  releaseNotesPath,
  buildReleaseNotes({
    version: nextVersion,
    previousVersion,
    changes: collectGitChanges(),
  }),
  "utf8",
);

console.log(`Prepared release ${nextVersion}`);
console.log(`Release notes: ${releaseNotesPath}`);

function validateVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version: ${version}`);
  }
}

function collectGitChanges() {
  const lastTag = safeExec(["describe", "--tags", "--abbrev=0"]).trim();
  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
  const log = safeExec(["log", "--pretty=format:%s", range]).trim();
  return log ? log.split("\n").filter(Boolean) : [];
}

function safeExec(args) {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function buildReleaseNotes({ version, previousVersion, changes }) {
  const bulletList = changes.length
    ? changes.map((line) => `- ${line}`).join("\n")
    : "- 이번 릴리즈에 대한 변경 요약을 작성해 주세요.\n- 핵심 사용자 영향 항목을 우선 정리해 주세요.";

  return `# Release ${version}

Previous version: ${previousVersion}

## Summary

- 사용자에게 보이는 주요 변경사항을 2-4줄로 정리해 주세요.

## Changes

${bulletList}

## Notes

- GitHub Release 본문에 이 문서를 붙여 넣어 사용할 수 있습니다.
- 자동 업데이트 배포 시 Windows는 \`latest.yml\`, macOS는 \`latest-mac.yml\`도 함께 업로드되어야 합니다.
`;
}
