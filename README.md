# AutoQA Desktop

URL 기반 클라이언트 QA 자동화 데스크톱 앱입니다. 기획서의 시나리오 기반 QA 자동화 방향을 바탕으로, 프로젝트 폴더 연결 대신 테스트 대상 URL을 입력해 Playwright 브라우저 테스트를 실행합니다.

## 핵심 기능

- macOS / Windows 패키징 가능한 Electron 앱
- URL 입력 기반 QA 실행
- Chromium, Chrome, Edge, Firefox, WebKit 계열 브라우저 선택 실행
- Markdown/Gherkin 스타일 시나리오 작성 및 파일 불러오기
- Playwright 기반 브라우저 자동화
- 기본 URL 상태 점검, 콘솔 오류, 이미지 로딩, 링크 상태 검사
- 실패 시 스크린샷 저장
- JSON/HTML 리포트 자동 생성

## 프로젝트 구조

현재 앱은 Electron + Playwright 기반이며, 렌더러는 FSD 스타일로 레이어를 나누기 시작했습니다.

```text
src/
├─ main.js            # Electron 부트스트랩
├─ main/              # 윈도우 생성, IPC, 업데이트 관리
├─ preload.js         # renderer <-> main 브리지
├─ renderer/
│  ├─ app/            # 렌더러 진입점
│  ├─ entities/       # 도메인 모델 레이어
│  ├─ features/       # 사용자 행동 단위 기능 레이어
│  ├─ pages/          # 화면 조합
│  ├─ shared/         # 공용 설정/DOM 참조
│  └─ widgets/        # 재사용 가능한 화면 블록 레이어
└─ autoqa/            # 시나리오 파싱, 실행, 리포트, 이력
```

처음 읽을 때 추천 순서는 아래와 같습니다.

1. 앱 시작 흐름: `src/main.js` -> `src/main/window.js` -> `src/main/ipc.js`
2. 화면 이벤트 흐름: `src/preload.js` -> `src/renderer/app/index.js` -> `src/renderer/pages/workspace/index.js`
3. QA 실행 흐름: `src/autoqa/parser.js` -> `src/autoqa/planner.js` -> `src/autoqa/runner.js`

상세 설명은 [docs/architecture.md](/Users/una/github/auto-qa/docs/architecture.md)에서 확인할 수 있습니다.

## 실행

```bash
npm install
npm run install:browsers
npm start
```

`npm run install:browsers`는 패키징된 앱에서도 동작하도록 Chromium을 프로젝트 내부에 내려받습니다.

## 테스트

```bash
npm test
```

## 패키징

```bash
npm run build:mac
npm run build:win
```

Windows 패키징은 Windows 환경에서 실행하는 것을 권장합니다.

## 배포 / 자동 업데이트

GitHub Releases를 통한 배포와 앱 내 자동 업데이트를 지원합니다.

- mac 업로드: `npm run publish:mac`
- Windows x64 업로드: `npm run publish:win:x64`
- Windows arm64 업로드: `npm run publish:win:arm64`
- 기본 일괄 업로드: `npm run publish:all` (`mac + Windows x64`)

업로드 전에는 `GH_TOKEN` 환경 변수가 필요합니다.

```bash
export GH_TOKEN=your_github_token
```

자세한 순서는 [docs/release.md](/Users/una/github/auto-qa/docs/release.md)에서 확인할 수 있습니다.
mac 공개 배포 체크리스트는 [docs/mac-distribution.md](/Users/una/github/auto-qa/docs/mac-distribution.md)에서 확인할 수 있습니다.

### 배포 주의사항

- Windows 자동 업데이트는 아키텍처별 채널을 사용합니다. 일반 배포는 `x64`를 기본값으로 두는 것이 안전합니다.
- macOS에서 외부 사용자에게 배포하려면 Apple Developer ID 서명과 notarization이 필요합니다.
- macOS 서명/노타리제이션 없이 배포하면 "손상된 앱"으로 보이거나 Gatekeeper에서 차단될 수 있습니다.
- Windows도 코드 서명이 없으면 SmartScreen 또는 보안 제품이 설치/업데이트를 차단할 수 있습니다.

mac 배포 전 환경 점검:

```bash
npm run doctor:mac-signing
```

## 시나리오 예시

```md
# 시나리오: 로그인 화면 확인
priority: Critical
tags: [auth, smoke]

Given /login 페이지로 이동한다
When 이메일을 'user@test.com' 으로 입력한다
And 비밀번호를 '1234' 으로 입력한다
And 로그인 버튼을 클릭한다
Then 대시보드 텍스트가 보인다
Then URL에 '/dashboard' 가 포함된다
```

지원하는 자연어 패턴은 MVP 기준으로 다음과 같습니다.

- `/path 페이지로 이동한다`
- `라벨을 '값' 으로 입력한다`
- `텍스트 버튼을 클릭한다`
- `텍스트가 보인다`
- `URL에 '문자열' 가 포함된다`
- `N초 기다린다`
- `상품 유형에서 '일반' 을 선택한다`
- `파일 다운로드 버튼을 클릭하여 다운로드한다`

상품 기능 고도화용 샘플은 [scenarios/product-qa.md](/Users/una/Documents/Codex/2026-04-21-files-mentioned-by-the-user-autoqa/scenarios/product-qa.md)에 있습니다.
