# macOS Public Distribution Checklist

AutoQA를 다른 Mac 사용자에게 설치 가능한 형태로 배포하려면 아래 조건이 모두 필요합니다.

## 1. 필요한 것

- Apple Developer Program 멤버십
- `Developer ID Application` 인증서
- notarization 인증 정보
  - 방법 A: `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
  - 방법 B: `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

현재 프로젝트는 위 조건이 없으면 `npm run publish:mac`가 실패하도록 설정되어 있습니다.

## 2. 현재 상태 확인

```bash
npm run doctor:mac-signing
```

성공 기준:

- `CSC_NAME`이 `Developer ID Application: ...` 형태
- `Developer ID Application certificate`가 존재
- `APPLE_ID auth: set` 또는 `App Store Connect API key auth: set`

## 3. Developer ID Application 인증서 발급

Apple Developer 사이트에서 진행합니다.

1. [Developer ID certificates](https://developer.apple.com/help/account/create-certificates/create-developer-id-certificates/) 열기
2. `Certificates` > `+`
3. `Developer ID Application` 선택
4. CSR 업로드 후 `.cer` 다운로드
5. 다운로드한 `.cer`를 더블클릭해 Keychain Access에 설치

설치 후 확인:

```bash
security find-identity -v -p codesigning
```

기대 결과 예시:

```text
"Developer ID Application: Your Name (TEAMID)"
```

## 4. 인증 정보 준비

### 방법 A. Apple ID + 앱 전용 비밀번호

필수 값:

```bash
export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
```

참고:

- 앱 전용 비밀번호: [Apple ID app-specific passwords](https://support.apple.com/en-us/102654)
- Team ID 확인: [Locate your Team ID](https://developer.apple.com/help/account/access/locate-your-team-id)

### 방법 B. App Store Connect API Key

API key 생성 참고:

- [Creating API Keys for App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api)

필수 값:

```bash
export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
export APPLE_API_KEY="/absolute/path/AuthKey_XXXXXXXXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## 5. 배포 실행

```bash
npm run doctor:mac-signing
npm run publish:mac
```

## 6. 결과 확인

산출물:

- `release/AutoQA <version>-arm64.dmg`
- `release/AutoQA-<version>-arm64-mac.zip`
- `release/latest-mac.yml`

배포 후 확인:

1. GitHub Releases에 파일이 올라갔는지
2. 새 Mac에서 설치 시 Gatekeeper 경고가 사라졌는지
3. 설치 후 자동 업데이트가 동작하는지

## 7. 자주 막히는 원인

- `Apple Development` 인증서만 있음
  - 공개 배포 불가
- `Developer ID Application` 인증서 없음
  - 공개 배포 불가
- notarization 인증 정보 없음
  - publish 실패
- 팀 권한 부족
  - Account Holder / Admin 권한 확인 필요
