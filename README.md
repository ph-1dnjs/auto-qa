# AutoQA Desktop

URL 기반 클라이언트 QA 자동화 데스크톱 앱입니다. 기획서의 시나리오 기반 QA 자동화 방향을 바탕으로, 프로젝트 폴더 연결 대신 테스트 대상 URL을 입력해 Playwright 브라우저 테스트를 실행합니다.

## 핵심 기능

- macOS / Windows 패키징 가능한 Electron 앱
- URL 입력 기반 QA 실행
- Markdown/Gherkin 스타일 시나리오 작성 및 파일 불러오기
- Playwright 기반 브라우저 자동화
- 기본 URL 상태 점검, 콘솔 오류, 이미지 로딩, 링크 상태 검사
- 실패 시 스크린샷 저장
- JSON/HTML 리포트 자동 생성

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
