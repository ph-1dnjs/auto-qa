# Release Guide

AutoQA는 GitHub Releases에 설치 파일과 업데이트 메타데이터를 업로드하면, 설치된 앱에서 새 버전을 확인하고 재설치 없이 업데이트할 수 있습니다.

이 프로젝트는 GitHub 공개 릴리스를 기준으로 자동 업데이트를 확인합니다. `Draft` 릴리스나 비공개 저장소의 비공개 릴리스는 설치된 앱이 `releases.atom`과 `latest.yml`을 읽지 못해 업데이트 확인이 실패할 수 있습니다.

## 1. 준비

GitHub Personal Access Token이 필요합니다.

- 권장 이름: `GH_TOKEN`
- 필요한 대상 저장소: `ph-1dnjs/auto-qa`
- 일반적으로 필요한 권한: Releases 업로드가 가능한 권한

쉘에 토큰을 넣습니다.

```bash
export GH_TOKEN=your_github_token
```

macOS 외부 배포까지 하려면 아래 값도 필요합니다.

```bash
export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
```

현재 설정에서는 `npm run publish:mac` 실행 시:

- `Developer ID Application` 인증서로 앱 서명
- `scripts/notarize.js`를 통해 notarization 시도

를 수행합니다. 값이 없으면 notarization은 건너뜁니다.

## 2. 버전 올리기

`package.json`의 `version`을 새 버전으로 올립니다.

예:

```json
"version": "0.1.1"
```

자동 업데이트는 설치된 앱 버전보다 높은 버전이 GitHub Releases에 올라와야 동작합니다.

## 3. 빌드/업로드 명령

mac 릴리즈 업로드:

```bash
npm run doctor:mac-signing
npm run publish:mac
```

Windows x64 릴리즈 업로드:

```bash
npm run publish:win:x64
```

Windows arm64 릴리즈 업로드(별도 채널):

```bash
npm run publish:win:arm64
```

`publish:all`은 기본적으로 `mac + Windows x64`까지만 업로드합니다.
Windows arm64까지 같은 릴리스에 연속 업로드하면 업데이트 메타데이터가 꼬이기 쉬워서, arm64는 필요할 때만 별도로 올리는 방식을 기본값으로 둡니다.

각 명령은 브라우저 설치를 먼저 수행한 뒤, 빌드 결과물과 업데이트 메타데이터를 GitHub Releases에 업로드합니다.
이 프로젝트는 [package.json](/Users/una/github/auto-qa/package.json:1)에서 `releaseType: "release"`를 사용해 초안이 아닌 공개 릴리스를 생성하도록 설정합니다.

## 4. 업로드되는 주요 파일

Windows:

- `AutoQA Setup <version>-x64.exe`
- `AutoQA Setup <version>-x64.exe.blockmap`
- `AutoQA <version>-x64.exe`
- `x64.yml`
- 필요 시 `arm64.yml`

macOS:

- `AutoQA <version>-arm64.dmg`
- `AutoQA-<version>-arm64-mac.zip`
- `AutoQA-<version>-arm64-mac.zip.blockmap`
- `latest-mac.yml`

앱 내 자동 업데이트는 주로 다음 파일을 사용합니다.

- Windows x64: `x64.yml`
- Windows arm64: `arm64.yml`
- macOS: `latest-mac.yml`

## 5. 배포 확인

업로드가 끝나면 GitHub Releases 페이지에서 다음을 확인합니다.

- 새 버전 릴리즈가 생성되었는지
- 릴리즈가 `Draft`가 아니라 `Published` 상태인지
- 설치 파일이 올라갔는지
- `x64.yml` 또는 `latest-mac.yml`이 같이 올라갔는지

## 6. 사용자 업데이트 흐름

설치된 앱은 시작 후 업데이트를 확인합니다.

- 새 버전이 없으면 현재 버전 유지
- 새 버전이 있으면 다운로드 시작
- 다운로드 완료 후 앱 상단에 설치 안내 표시
- 사용자가 `지금 설치`를 누르면 재시작 후 업데이트 적용

## 7. 주의사항

- Windows는 일반적으로 `x64` 빌드를 배포용 기본값으로 사용합니다. `publish:all`도 이 기준으로 동작합니다.
- Windows는 서명되지 않은 설치 파일에서 SmartScreen 또는 백신 차단이 발생할 수 있습니다. 자동 업데이트도 새 설치 프로그램 실행 단계에서 같은 이유로 막힐 수 있습니다.
- macOS는 서명과 notarization이 없는 앱을 인터넷에서 내려받아 실행하면 "손상되었기 때문에 열 수 없습니다" 또는 유사한 Gatekeeper 경고가 날 수 있습니다.
- macOS 외부 배포를 정상화하려면 Apple Developer ID Application 인증서와 notarization이 필요합니다.
- 현재 프로젝트는 `scripts/notarize.js`를 통해 `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`가 설정된 경우 notarization을 수행합니다.
- `npm run doctor:mac-signing`으로 현재 셸의 mac 배포 필수 환경변수를 점검할 수 있습니다.
- GitHub 저장소가 비공개라면 기본 GitHub auto-update 방식으로는 최종 사용자 앱이 업데이트를 읽기 어렵습니다. 이 경우 공개 릴리스로 전환하거나 `generic` provider 같은 별도 배포 경로가 필요합니다.
