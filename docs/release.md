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
npm run publish:mac
```

Windows x64 릴리즈 업로드:

```bash
npm run publish:win:x64
```

Windows arm64 릴리즈 업로드:

```bash
npm run publish:win:arm64
```

각 명령은 브라우저 설치를 먼저 수행한 뒤, 빌드 결과물과 업데이트 메타데이터를 GitHub Releases에 업로드합니다.
이 프로젝트는 [package.json](/Users/una/github/auto-qa/package.json:1)에서 `releaseType: "release"`를 사용해 초안이 아닌 공개 릴리스를 생성하도록 설정합니다.

## 4. 업로드되는 주요 파일

Windows:

- `AutoQA Setup <version>-x64.exe`
- `AutoQA Setup <version>-x64.exe.blockmap`
- `AutoQA <version>-x64.exe`
- `latest.yml`

macOS:

- `AutoQA <version>-arm64.dmg`
- `AutoQA-<version>-arm64-mac.zip`
- `AutoQA-<version>-arm64-mac.zip.blockmap`
- `latest-mac.yml`

앱 내 자동 업데이트는 주로 다음 파일을 사용합니다.

- Windows: `latest.yml`
- macOS: `latest-mac.yml`

## 5. 배포 확인

업로드가 끝나면 GitHub Releases 페이지에서 다음을 확인합니다.

- 새 버전 릴리즈가 생성되었는지
- 릴리즈가 `Draft`가 아니라 `Published` 상태인지
- 설치 파일이 올라갔는지
- `latest.yml` 또는 `latest-mac.yml`이 같이 올라갔는지

## 6. 사용자 업데이트 흐름

설치된 앱은 시작 후 업데이트를 확인합니다.

- 새 버전이 없으면 현재 버전 유지
- 새 버전이 있으면 다운로드 시작
- 다운로드 완료 후 앱 상단에 설치 안내 표시
- 사용자가 `지금 설치`를 누르면 재시작 후 업데이트 적용

## 7. 주의사항

- Windows는 일반적으로 `x64` 빌드를 배포용 기본값으로 사용합니다.
- macOS는 현재 빌드 가능하지만, 외부 사용자 배포 경험을 좋게 하려면 코드 서명과 notarization이 필요할 수 있습니다.
- 코드 서명이 없으면 SmartScreen 또는 Gatekeeper 경고가 나타날 수 있습니다.
- GitHub 저장소가 비공개라면 기본 GitHub auto-update 방식으로는 최종 사용자 앱이 업데이트를 읽기 어렵습니다. 이 경우 공개 릴리스로 전환하거나 `generic` provider 같은 별도 배포 경로가 필요합니다.
