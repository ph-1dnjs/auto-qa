const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const XLSX = require("xlsx");
const {
  extractScenarioMarkdownFromStructuredFile,
  loadScenarioFileContent
} = require("../src/autoqa/scenario-import");

test("converts testcase workbook into markdown scenarios using companion scenario workbook", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-scenario-import-"));
  const testCasePath = path.join(tempDir, "USR_회원_QA테스트케이스_샘플.xlsx");
  const scenarioPath = path.join(tempDir, "USR_회원_QA시나리오_샘플.xlsx");

  writeWorkbook(testCasePath, [
    ["QA 테스트 케이스"],
    ["시스템명: 플랫폼", "서브시스템명: 회원 - 거래약정서 전자서명"],
    ["TC ID", "시나리오 ID", "화면명", "TC명", "테스트 유형", "사전 조건", "테스트 단계\n(Step-by-Step)", "테스트 데이터", "기대 결과", "우선순위"],
    ["① 거래약정서 조회"],
    ["USR-MEM-002-TC001", "USR-MEM-002", "거래약정서 조회", "거래약정서 임베디드 정상 표시", "기능", "가입 승인 완료 계정 / 전자서명 미완료 상태", "1. 승인 완료 계정으로 로그인\n2. 최초 로그인 후 화면 확인", "승인 완료 일반 회원 계정", "거래약정서가 임베디드 형태로 화면에 정상 표시됨", "High"]
  ]);

  writeWorkbook(scenarioPath, [
    ["QA 테스트 시나리오"],
    ["시스템명: 플랫폼", "서브시스템명: 회원 - 거래약정서 전자서명"],
    ["시나리오 ID", "시나리오명", "시나리오 설명", "사전 조건", "테스트 유형", "우선순위"],
    ["① 거래약정서 조회"],
    ["USR-MEM-002", "거래약정서 정상 조회", "가입 승인된 회원이 최초 로그인 시 거래약정서가 표시되는지 확인", "가입 승인 완료 계정 / 전자서명 미완료 상태", "기능", "Critical"]
  ]);

  const markdown = await extractScenarioMarkdownFromStructuredFile(testCasePath);

  assert.match(markdown, /# 시나리오: 거래약정서 임베디드 정상 표시/);
  assert.match(markdown, /priority: Critical/);
  assert.match(markdown, /feature: 플랫폼\/회원\/거래약정서 전자서명/);
  assert.match(markdown, /suite: ① 거래약정서 조회/);
  assert.match(markdown, /tags: \[기능, USR-MEM-002, USR-MEM-002-TC001\]/);
  assert.match(markdown, /Given 가입 승인 완료 계정/);
  assert.match(markdown, /And 전자서명 미완료 상태/);
  assert.match(markdown, /Then 거래약정서 텍스트가 보인다/);
});

test("loads detailed testcase markdown even when the scenario workbook is selected first", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-scenario-import-"));
  const testCasePath = path.join(tempDir, "USR_회원_QA테스트케이스_샘플.xlsx");
  const scenarioPath = path.join(tempDir, "USR_회원_QA시나리오_샘플.xlsx");

  writeWorkbook(testCasePath, [
    ["QA 테스트 케이스"],
    ["시스템명: 플랫폼", "서브시스템명: 회원 - 거래약정서 전자서명"],
    ["TC ID", "시나리오 ID", "화면명", "TC명", "테스트 유형", "사전 조건", "테스트 단계\n(Step-by-Step)", "테스트 데이터", "기대 결과"],
    ["① 전자서명"],
    ["USR-MEM-007-TC001", "USR-MEM-007", "전자서명", "스크롤 미완료 시 서명 버튼 비활성화", "기능", "거래약정서 조회 완료 / 스크롤 미완료 상태", "1. 거래약정서 페이지 진입\n2. 스크롤을 끝까지 내리지 않은 상태에서 서명 버튼 상태 확인", "-", "전자서명 버튼이 비활성화(disabled) 상태로 표시됨"]
  ]);

  writeWorkbook(scenarioPath, [
    ["QA 테스트 시나리오"],
    ["시스템명: 플랫폼", "서브시스템명: 회원 - 거래약정서 전자서명"],
    ["시나리오 ID", "시나리오명", "시나리오 설명", "사전 조건", "테스트 유형"],
    ["① 전자서명"],
    ["USR-MEM-007", "스크롤 미완료 시 서명 버튼 비활성화", "스크롤 미완료 상태에서 버튼이 비활성화인지 확인", "거래약정서 조회 완료 / 스크롤 미완료 상태", "기능"]
  ]);

  const markdown = await loadScenarioFileContent(scenarioPath);

  assert.match(markdown, /tcId: USR-MEM-007-TC001/);
  assert.match(markdown, /When \/login 페이지로 이동한다/);
  assert.match(markdown, /Then 전자서명 버튼이 비활성화 상태다/);
});

test("converts explicit input and click testcase steps into executable markdown", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-scenario-import-"));
  const testCasePath = path.join(tempDir, "상품_QA테스트케이스_샘플.xlsx");

  writeWorkbook(testCasePath, [
    ["QA 테스트 케이스"],
    ["시스템명: 플랫폼", "서브시스템명: 상품 - 검색"],
    ["TC ID", "시나리오 ID", "화면명", "TC명", "테스트 유형", "사전 조건", "테스트 단계\n(Step-by-Step)", "테스트 데이터", "기대 결과", "우선순위"],
    ["① 상품 검색"],
    ["PRD-SCH-001", "PRD-SCH", "상품 검색", "검색어 입력 후 조회", "기능", "-", "1. /search 페이지 진입\n2. 검색어 입력\n3. 검색 버튼 클릭", "리쥬란", "리쥬란 텍스트가 정상 표시됨", "High"]
  ]);

  const markdown = await extractScenarioMarkdownFromStructuredFile(testCasePath);

  assert.match(markdown, /When \/search 페이지로 이동한다/);
  assert.match(markdown, /When 검색어에 '리쥬란' 입력한다/);
  assert.match(markdown, /When 검색 버튼을 클릭한다/);
  assert.match(markdown, /Then 리쥬란 텍스트가 보인다/);
});

test("loads utf-8 csv scenario file and formats it into markdown scenarios", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-scenario-import-"));
  const csvPath = path.join(tempDir, "회원_로그인_QA_20260531(시나리오).csv");
  writeCsvWorkbook(csvPath, [
    ["QA 테스트 시나리오 — 로그인 (USR)"],
    ["시나리오 ID", "도메인", "플랫폼", "시나리오명", "시나리오 설명", "사전 조건", "테스트 유형", "우선순위", "담당자"],
    ["① 로그인"],
    ["USR-LOG-002", "회원", "USR", "가입 승인 계정 로그인 성공", "올바른 아이디/비밀번호 입력 시 가입 승인 계정은 정상 로그인된다.", "가입 승인 상태의 계정 / 국내 IP", "기능", "Critical", ""],
    ["USR-LOG-006", "회원", "USR", "해외 IP 접근 차단", "해외 IP에서 로그인 페이지 접근 시 차단된다.", "해외 IP 환경", "예외처리", "High", ""]
  ]);

  const markdown = await loadScenarioFileContent(csvPath);

  assert.match(markdown, /# 시나리오: 가입 승인 계정 로그인 성공/);
  assert.match(markdown, /priority: Critical/);
  assert.match(markdown, /tags: \[기능, 회원, USR, USR-LOG-002\]/);
  assert.match(markdown, /feature: 회원\/USR/);
  assert.match(markdown, /suite: ① 로그인/);
  assert.match(markdown, /Given 가입 승인 상태의 계정/);
  assert.match(markdown, /And 국내 IP/);
  assert.match(markdown, /When \/login 페이지로 이동한다/);
  assert.match(markdown, /And 아이디에 'AUTOQA_USER' 입력한다/);
  assert.match(markdown, /And 비밀번호에 'AUTOQA_PASSWORD' 입력한다/);
  assert.match(markdown, /And 로그인 버튼을 클릭한다/);
  assert.match(markdown, /Then 메인 텍스트가 보인다/);
  assert.match(markdown, /# 시나리오: 해외 IP 접근 차단/);
  assert.match(markdown, /And 로그인 버튼을 클릭한다/);
  assert.match(markdown, /Then 차단 텍스트가 보인다/);
});

test("loads utf-8 csv testcase file with companion scenario csv and builds executable markdown", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-scenario-import-"));
  const testCasePath = path.join(tempDir, "회원_로그인_QA_20260531(테스트케이스).csv");
  const scenarioPath = path.join(tempDir, "회원_로그인_QA_20260531(시나리오).csv");

  writeCsvWorkbook(testCasePath, [
    ["QA 테스트 케이스 — 로그인 (USR)"],
    ["TC ID", "시나리오 ID", "도메인", "플랫폼", "화면명", "TC명", "테스트 유형", "사전 조건", "테스트 단계\n(Step-by-Step)", "테스트 데이터", "기대 결과", "우선순위"],
    ["① 로그인"],
    ["USR-LOG-002-TC001", "USR-LOG-002", "회원", "USR", "로그인", "가입 승인 계정 로그인 성공", "기능", "가입 승인 상태의 계정 / 국내 IP", "1. /login 페이지 진입\n2. 아이디 입력\n3. 비밀번호 입력\n4. 로그인 버튼 클릭", "user01", "메인 페이지로 이동", "High"]
  ]);
  writeCsvWorkbook(scenarioPath, [
    ["QA 테스트 시나리오 — 로그인 (USR)"],
    ["시나리오 ID", "도메인", "플랫폼", "시나리오명", "시나리오 설명", "사전 조건", "테스트 유형", "우선순위", "담당자"],
    ["① 로그인"],
    ["USR-LOG-002", "회원", "USR", "가입 승인 계정 로그인 성공", "올바른 아이디/비밀번호 입력 시 가입 승인 계정은 정상 로그인된다.", "가입 승인 상태의 계정 / 국내 IP", "기능", "Critical", ""]
  ]);

  const markdown = await loadScenarioFileContent(testCasePath);

  assert.match(markdown, /# 시나리오: 가입 승인 계정 로그인 성공/);
  assert.match(markdown, /priority: Critical/);
  assert.match(markdown, /tags: \[기능, 회원, USR, USR-LOG-002, USR-LOG-002-TC001\]/);
  assert.match(markdown, /feature: 회원\/USR/);
  assert.match(markdown, /suite: ① 로그인/);
  assert.match(markdown, /When \/login 페이지로 이동한다/);
  assert.match(markdown, /And 아이디에 'user01' 입력한다/);
  assert.match(markdown, /And 비밀번호에 'user01' 입력한다/);
  assert.match(markdown, /And 로그인 버튼을 클릭한다/);
  assert.match(markdown, /Then 메인 텍스트가 보인다/);
});

test("adds fallback interactive steps for testcase rows that describe login attempts abstractly", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoqa-scenario-import-"));
  const testCasePath = path.join(tempDir, "회원_로그인_QA_20260531(테스트케이스).csv");
  const scenarioPath = path.join(tempDir, "회원_로그인_QA_20260531(시나리오).csv");

  writeCsvWorkbook(testCasePath, [
    ["QA 테스트 케이스 — 로그인 (USR)"],
    ["TC ID", "시나리오 ID", "TC명", "테스트 유형", "사전 조건", "테스트 단계\n(Step-by-Step)", "테스트 데이터", "기대 결과", "우선순위"],
    ["① 로그인"],
    ["USR-LOG-003-TC001", "USR-LOG-003", "[기능] 승인 보류 계정 — GUEST 권한 로그인", "기능", "승인 보류 상태 계정", "1. 승인 보류 계정으로 로그인\n2. 상품 상세 페이지 접근 시도", "승인 보류 계정", "로그인은 성공하나 상품 상세 조회 및 주문 불가 (GUEST 권한)", "High"],
    ["USR-LOG-005-TC002", "USR-LOG-005", "[예외처리] 비밀번호 5회 오류 — 계정 잠금 처리", "예외처리", "가입 승인 계정", "1. 잘못된 비밀번호로 5회 연속 로그인 시도", "가입 승인 계정 / 잘못된 비밀번호", "계정 접근 제한(잠금) 처리 및 안내 메시지 노출", "High"]
  ]);
  writeCsvWorkbook(scenarioPath, [
    ["QA 테스트 시나리오 — 로그인 (USR)"],
    ["시나리오 ID", "도메인", "플랫폼", "시나리오명", "시나리오 설명", "사전 조건", "테스트 유형", "우선순위", "담당자"],
    ["① 로그인"],
    ["USR-LOG-003", "회원", "USR", "승인 보류/SAP 승인 요청 계정 GUEST 로그인", "승인 보류 또는 SAP 승인 요청 상태 계정은 GUEST 권한으로 로그인된다.", "승인 보류 또는 SAP 승인 요청 상태 계정", "기능", "Critical", ""],
    ["USR-LOG-005", "회원", "USR", "비밀번호 5회 오류 시 계정 잠금", "비밀번호를 5회 연속 틀리면 계정이 잠금 처리된다.", "가입 승인 상태 계정", "예외처리", "High", ""]
  ]);

  const markdown = await loadScenarioFileContent(testCasePath);

  assert.match(markdown, /And 아이디에 'AUTOQA_USER' 입력한다/);
  assert.match(markdown, /And 비밀번호에 'AUTOQA_PASSWORD' 입력한다/);
  assert.match(markdown, /And 상품 상세 페이지로 이동한다/);
  assert.match(markdown, /Then GUEST 텍스트가 보인다/);
  assert.match(markdown, /And 비밀번호에 'AUTOQA_INVALID_PASSWORD' 입력한다/);
  assert.match(markdown, /Then 잠금 텍스트가 보인다/);
});

function writeWorkbook(filePath, rows) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, filePath);
}

function writeCsvWorkbook(filePath, rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  fs.writeFileSync(filePath, `\uFEFF${csv}`, "utf8");
}
