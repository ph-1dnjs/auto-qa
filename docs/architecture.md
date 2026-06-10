# AutoQA 아키텍처 가이드

이 문서는 "어디서부터 읽어야 하는지"를 빠르게 파악하기 위한 코드 안내서입니다.

## 1. 큰 흐름

앱은 Electron 기반이며, 실행 흐름은 아래 순서입니다.

1. `src/main.js`
2. `src/main/window.js`
3. `src/main/ipc.js`
4. `src/preload.js`
5. `src/renderer/app/index.js`
6. `src/renderer/pages/workspace/index.js`
7. `src/autoqa/*`

요약하면 다음과 같습니다.

1. 메인 프로세스가 앱 윈도우를 띄웁니다.
2. IPC 핸들러가 파일 저장, QA 실행, 리포트 열기 같은 OS/Node 작업을 받습니다.
3. `preload`가 렌더러에 안전한 API만 노출합니다.
4. 렌더러 진입점이 페이지 모듈을 로드합니다.
5. 페이지 모듈이 화면 이벤트를 처리하고 `window.autoqa.*` API를 호출합니다.
6. 실제 QA 실행은 `src/autoqa/runner.js`가 Playwright를 통해 수행합니다.

## 2. 디렉터리 역할

```text
src/
├─ main.js                    # Electron 부트스트랩
├─ main/
│  ├─ window.js               # BrowserWindow 생성
│  ├─ update-manager.js       # 자동 업데이트 상태 관리
│  ├─ ipc.js                  # IPC 채널 등록
│  └─ utils.js                # 메인 프로세스 공용 유틸
├─ preload.js                 # renderer에 노출할 API 브리지
├─ recorder-preload.js        # 시나리오 추출 webview 보조 스크립트
├─ renderer/
│  ├─ index.html              # 단일 UI 진입점
│  ├─ styles.css              # 전체 스타일
│  ├─ app/
│  │  └─ index.js             # 렌더러 부트스트랩
│  ├─ entities/
│  │  └─ README.md            # 도메인 모델 분리 가이드
│  ├─ features/
│  │  └─ README.md            # 기능 분리 가이드
│  ├─ pages/
│  │  └─ workspace/
│  │     └─ index.js          # 현재 단일 워크스페이스 화면 조합
│  ├─ shared/
│     ├─ config/
│     │  └─ ui.js             # 렌더러 상수/설정 모음
│     └─ lib/
│        └─ dom/
│           └─ elements.js    # DOM 셀렉터 모음
│  └─ widgets/
│     └─ README.md            # 화면 블록 분리 가이드
└─ autoqa/
   ├─ parser.js               # 시나리오 텍스트 파싱
   ├─ planner.js              # feature/suite 분석, 영향도 계산
   ├─ runner.js               # Playwright 실행 엔진
   ├─ report.js               # JSON/HTML 리포트 생성
   ├─ history.js              # 실행 이력 저장/요약
   ├─ scenario-import.js      # md/json/csv/xlsx 시나리오 불러오기
   └─ failure-export.js       # 실패 시나리오 내보내기
```

## 3. 처음 읽는 순서

### UI와 실행 연결을 이해하고 싶을 때

1. `src/preload.js`
2. `src/renderer/app/index.js`
3. `src/renderer/pages/workspace/index.js`
4. `src/main/ipc.js`

이 순서로 보면 버튼 클릭이 어떤 IPC 채널로 이어지고, 그 채널이 어떤 Node 작업을 하는지 바로 연결됩니다.

### QA 엔진을 이해하고 싶을 때

1. `src/autoqa/parser.js`
2. `src/autoqa/planner.js`
3. `src/autoqa/runner.js`
4. `src/autoqa/report.js`

이 순서로 보면 "시나리오 문자열 -> 실행 가능한 step -> 브라우저 실행 -> 결과 리포트" 흐름이 보입니다.

### 배포/업데이트를 이해하고 싶을 때

1. `src/main.js`
2. `src/main/update-manager.js`
3. `docs/release.md`
4. `docs/mac-distribution.md`

## 4. 책임 분리 기준

현재 구조에서 중요한 기준은 아래와 같습니다.

- `main.js`는 조립만 합니다.
- `src/main/window.js`는 창 생성만 담당합니다.
- `src/main/ipc.js`는 IPC 등록만 담당합니다.
- `src/main/update-manager.js`는 업데이트 상태 전이만 담당합니다.
- `src/renderer/app/index.js`는 렌더러 진입점만 담당합니다.
- `src/renderer/shared/lib/dom/elements.js`는 DOM 참조 정의만 담당합니다.
- `src/renderer/shared/config/ui.js`는 렌더러 상수만 담당합니다.
- `src/renderer/pages/workspace/index.js`는 현재 워크스페이스 화면 동작을 조합합니다.

즉, "설정", "연결", "실행"을 같은 파일에 섞지 않는 방향으로 정리했습니다.

## 5. 유지보수 규칙

새 기능을 추가할 때는 아래 위치 기준을 우선 적용하면 됩니다.

- 새 버튼/필드 추가: `src/renderer/index.html`, `src/renderer/shared/lib/dom/elements.js`
- 렌더러 상수 추가: `src/renderer/shared/config/ui.js`
- 새 IPC 채널 추가: `src/main/ipc.js`
- 새 브라우저 QA 동작 추가: `src/autoqa/runner.js`
- 새 시나리오 문법 추가: `src/autoqa/parser.js`
- 새 리포트 형식 추가: `src/autoqa/report.js`, `src/autoqa/failure-export.js`

## 6. 다음 리팩터링 후보

이번 변경은 동작 보존을 우선으로 한 구조 정리입니다. 다음 후보는 아래 두 가지입니다.

1. `src/renderer/pages/workspace/index.js`에 있는 기능을 실제 `widgets`, `features`, `entities` 레이어 코드로 이동
2. `src/autoqa/runner.js`를 `브라우저 실행`, `시나리오 실행`, `step 유틸` 단위로 추가 분리

현재도 이전보다 읽기 쉬워졌지만, 가장 큰 파일 두 개는 여전히 후속 분리 여지가 있습니다.
