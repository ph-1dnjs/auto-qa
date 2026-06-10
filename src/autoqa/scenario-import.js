const fs = require("node:fs/promises");
const path = require("node:path");
const XLSX = require("xlsx");

const TEST_CASE_HEADER = "TC ID";
const SCENARIO_HEADER = "시나리오 ID";

async function loadScenarioFileContent(filePath) {
  if (isStructuredScenarioFile(filePath)) {
    return extractScenarioMarkdownFromStructuredFile(filePath);
  }

  return fs.readFile(filePath, "utf8");
}

async function extractScenarioMarkdownFromStructuredFile(filePath) {
  const primarySheet = readFirstSheet(filePath);
  const primaryType = detectSheetType(primarySheet.rows);

  if (primaryType === "testcase") {
    const companion = findCompanionWorkbook(filePath, "scenario");
    const scenarioSheet = companion ? readFirstSheet(companion) : null;
    return buildMarkdownFromTestCases(primarySheet, scenarioSheet);
  }

  if (primaryType === "scenario") {
    const companion = findCompanionWorkbook(filePath, "testcase");
    if (companion) {
      const testCaseSheet = readFirstSheet(companion);
      if (detectSheetType(testCaseSheet.rows) === "testcase") {
        return buildMarkdownFromTestCases(
          testCaseSheet,
          primarySheet
        );
      }
    }

    return buildMarkdownFromScenarioSheet(primarySheet);
  }

  throw new Error("지원하지 않는 시나리오 파일 형식입니다. CSV/XLSX 테스트케이스 또는 시나리오 양식을 확인하세요.");
}

function buildMarkdownFromTestCases(testCaseSheet, scenarioSheet) {
  const context = buildContext(testCaseSheet.context, scenarioSheet?.context);
  const scenarioMap = buildScenarioMap(scenarioSheet);
  const lines = [];

  for (const record of testCaseSheet.records) {
    const scenario = scenarioMap.get(record.scenarioId) || {};
    const featurePath = context.featurePath || buildRecordFeaturePath(record) || buildRecordFeaturePath(scenario);
    const title = record.name || scenario.name || record.tcId;
    const tags = compact([
      record.testType,
      record.domain || scenario.domain,
      record.platform || scenario.platform,
      record.scenarioId,
      record.tcId
    ]);
    const steps = buildExecutableTestCaseSteps(record, scenario);

    lines.push(`# 시나리오: ${title}`);
    if (scenario.priority || record.priority) {
      lines.push(`priority: ${scenario.priority || record.priority}`);
    }
    if (tags.length) {
      lines.push(`tags: [${tags.map(formatTag).join(", ")}]`);
    }
    if (featurePath) {
      lines.push(`feature: ${featurePath}`);
    }
    if (record.suite) {
      lines.push(`suite: ${record.suite}`);
    }
    lines.push(`scenarioId: ${record.scenarioId}`);
    lines.push(`tcId: ${record.tcId}`);
    lines.push("");
    lines.push(...steps);
    lines.push("");
  }

  return lines.join("\n").trim();
}

function buildMarkdownFromScenarioSheet(sheet) {
  const context = buildContext(sheet.context);
  const lines = [];

  for (const record of sheet.records) {
    const featurePath = context.featurePath || buildRecordFeaturePath(record);
    const tags = compact([record.testType, record.domain, record.platform, record.scenarioId]);
    const steps = buildExecutableScenarioSteps(record);

    lines.push(`# 시나리오: ${record.name || record.scenarioId}`);
    if (record.priority) {
      lines.push(`priority: ${record.priority}`);
    }
    if (tags.length) {
      lines.push(`tags: [${tags.map(formatTag).join(", ")}]`);
    }
    if (featurePath) {
      lines.push(`feature: ${featurePath}`);
    }
    if (record.suite) {
      lines.push(`suite: ${record.suite}`);
    }
    lines.push(`scenarioId: ${record.scenarioId}`);
    lines.push("");
    lines.push(...steps);
    lines.push("");
  }

  return lines.join("\n").trim();
}

function readFirstSheet(filePath) {
  const workbook = XLSX.readFile(filePath, { raw: false });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    blankrows: false
  });
  const headerIndex = findHeaderIndex(rows);
  const type = detectSheetType(rows);

  return {
    filePath,
    sheetName,
    rows,
    context: extractContext(rows, headerIndex),
    records: headerIndex >= 0 ? extractRecords(rows, headerIndex, type) : []
  };
}

function detectSheetType(rows) {
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) return "unknown";

  const headerRow = rows[headerIndex].map(normalizeCell);
  if (headerRow.includes(TEST_CASE_HEADER)) return "testcase";
  if (headerRow.includes(SCENARIO_HEADER)) return "scenario";
  return "unknown";
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const cells = row.map(normalizeCell);
    return cells.includes(TEST_CASE_HEADER) || cells.includes(SCENARIO_HEADER);
  });
}

function extractContext(rows, headerIndex) {
  const contextRows = headerIndex > 0 ? rows.slice(0, headerIndex) : rows;
  const context = {};

  for (const row of contextRows) {
    for (const cell of row.map(normalizeCell).filter(Boolean)) {
      if (!context.systemName) {
        const systemMatch = cell.match(/시스템명:\s*(.+?)(?=\s+서브시스템명:|$)/);
        if (systemMatch) context.systemName = systemMatch[1].trim();
      }

      if (!context.subsystemName) {
        const subsystemMatch = cell.match(/서브시스템명:\s*(.+)$/);
        if (subsystemMatch) context.subsystemName = subsystemMatch[1].trim();
      }

      if (!context.title) {
        const titleMatch = cell.match(/^QA 테스트 시나리오\s*[—-]\s*(.+)$/);
        if (titleMatch) context.title = titleMatch[1].trim();
      }
    }
  }

  return context;
}

function buildContext(...contexts) {
  const merged = contexts.reduce((result, context) => ({
    systemName: result.systemName || context?.systemName || "",
    subsystemName: result.subsystemName || context?.subsystemName || ""
  }), { systemName: "", subsystemName: "" });

  const featureParts = compact([
    merged.systemName,
    ...String(merged.subsystemName || "")
      .split(/\s*-\s*/)
      .map((part) => part.trim())
      .filter(Boolean)
  ]);

  return {
    ...merged,
    featurePath: featureParts.join("/")
  };
}

function extractRecords(rows, headerIndex, type) {
  const headers = rows[headerIndex].map(normalizeCell);
  const dataRows = rows.slice(headerIndex + 1);
  const records = [];
  let currentSuite = "";

  for (const row of dataRows) {
    const cells = row.map(normalizeCell);
    const entry = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));

    if (
      type === "testcase" &&
      entry[TEST_CASE_HEADER] &&
      !entry[SCENARIO_HEADER] &&
      cells.filter(Boolean).length === 1
    ) {
      currentSuite = cells.find(Boolean) || currentSuite;
      continue;
    }

    if (
      type === "scenario" &&
      entry[SCENARIO_HEADER] &&
      !entry["시나리오명"] &&
      cells.filter(Boolean).length === 1
    ) {
      currentSuite = cells.find(Boolean) || currentSuite;
      continue;
    }

    if (type === "testcase") {
      if (!entry[TEST_CASE_HEADER] || !entry[SCENARIO_HEADER]) continue;
      records.push({
        tcId: entry[TEST_CASE_HEADER],
        scenarioId: entry[SCENARIO_HEADER],
        domain: entry["도메인"],
        platform: entry["플랫폼"],
        screenName: entry["화면명"],
        name: entry["TC명"],
        testType: entry["테스트 유형"],
        precondition: entry["사전 조건"],
        steps: entry["테스트 단계\n(Step-by-Step)"],
        testData: entry["테스트 데이터"],
        expectedResult: entry["기대 결과"],
        priority: entry["우선순위"],
        suite: currentSuite || entry["화면명"]
      });
    }

    if (type === "scenario") {
      if (!entry[SCENARIO_HEADER]) continue;
      records.push({
        scenarioId: entry[SCENARIO_HEADER],
        domain: entry["도메인"],
        platform: entry["플랫폼"],
        name: entry["시나리오명"],
        description: entry["시나리오 설명"],
        precondition: entry["사전 조건"],
        testType: entry["테스트 유형"],
        priority: entry["우선순위"],
        owner: entry["담당자"],
        suite: currentSuite
      });
    }
  }

  return records;
}

function buildScenarioMap(sheet) {
  if (!sheet) return new Map();

  return new Map(
    sheet.records.map((record) => [record.scenarioId, record])
  );
}

function toGivenSteps(value) {
  return toStepLines(value, "Given");
}

function toActionSteps(value) {
  const parts = splitStepLines(value);
  if (!parts.length) return [];

  return parts.map((part, index) => {
    const normalized = normalizeScenarioDescriptionStep(part);
    return `${index === 0 ? "When" : "And"} ${normalized}`;
  });
}

function buildExecutableScenarioSteps(record) {
  const steps = dedupeSteps([
    ...toGivenSteps(record.precondition),
    ...inferScenarioNavigationSteps(record),
    ...inferScenarioInteractionSteps(record),
    ...inferScenarioAssertionSteps(record)
  ]);

  if (steps.length) return steps;
  return [`Then ${record.name || record.scenarioId} 관련 케이스를 확인한다`];
}

function buildExecutableTestCaseSteps(record, scenario) {
  const baseSteps = dedupeSteps([
    ...toGivenSteps(record.precondition || scenario.precondition),
    ...toExecutableActionSteps(record),
    ...toExecutableResultSteps(record)
  ]);

  const inferred = dedupeSteps([
    ...toGivenSteps(record.precondition || scenario.precondition),
    ...inferTestCaseNavigationSteps(record, scenario),
    ...inferTestCaseInteractionSteps(record, scenario),
    ...toExecutableResultSteps(record),
    ...inferTestCaseAssertionSteps(record, scenario)
  ]);

  if (hasInteractiveStepLines(inferred)) {
    return inferred;
  }

  if (hasInteractiveStepLines(baseSteps)) {
    return baseSteps;
  }

  const fallbackText = inferVisibleText(record);
  if (fallbackText) {
    baseSteps.push(`Then ${fallbackText} 텍스트가 보인다`);
  }

  return baseSteps;
}

function toExecutableActionSteps(record) {
  const parts = splitStepLines(record.steps);
  const executable = [];

  for (const part of parts) {
    const action = convertActionStep(part, record);
    if (action) executable.push(action);
  }

  return executable;
}

function toExecutableResultSteps(record) {
  const result = String(record.expectedResult || "").trim();
  const assertions = [];
  const explicitValue = extractAssertionValue(record.testData);

  const disabledButton = result.match(/^(.+?)\s*버튼이\s*비활성화/i);
  if (disabledButton) {
    assertions.push(`Then ${disabledButton[1].trim()} 버튼이 비활성화 상태다`);
    return assertions;
  }

  const enabledButton = result.match(/^(.+?)\s*버튼이\s*활성화/i);
  if (enabledButton) {
    assertions.push(`Then ${enabledButton[1].trim()} 버튼이 활성화 상태다`);
    return assertions;
  }

  if (explicitValue && /정확히\s*표시됨|정상\s*표시됨/.test(result)) {
    assertions.push(`Then ${explicitValue} 텍스트가 보인다`);
  }

  if (/문의하기/.test(result)) {
    assertions.push("Then 문의하기 텍스트가 보인다");
  }
  if (/재시도/.test(result)) {
    assertions.push("Then 재시도 텍스트가 보인다");
  }
  if (/비밀번호 재설정 페이지로 이동/.test(result)) {
    assertions.push("Then 비밀번호 재설정 텍스트가 보인다");
  }
  if (/메인 페이지로 이동/.test(result)) {
    assertions.push("Then 메인 텍스트가 보인다");
  }
  if (/카카오채널/.test(result)) {
    assertions.push("Then 카카오채널 텍스트가 보인다");
  }

  const inferred = inferVisibleText(record);
  if (!assertions.length && inferred) {
    assertions.push(`Then ${inferred} 텍스트가 보인다`);
  }

  return dedupeSteps(assertions);
}

function hasInteractiveStepLines(steps) {
  return steps.some((step) => /^(When|And)\s+/.test(step) && !/텍스트가 보인다|버튼이 비활성화 상태다|버튼이 활성화 상태다|관련 케이스를 확인한다/.test(step));
}

function buildRecordFeaturePath(record) {
  return compact([
    String(record.domain || "").trim(),
    String(record.platform || "").trim()
  ]).join("/");
}

function inferTestCaseNavigationSteps(record, scenario) {
  const route = inferTestCaseRoute(record, scenario);
  return route ? [`When ${route} 페이지로 이동한다`] : [];
}

function inferTestCaseInteractionSteps(record, scenario) {
  const text = collectTestCaseText(record, scenario);
  const steps = [];
  const testDataValue = extractInputValue(record.testData);

  if (/(로그인|재로그인|로그인 시도|90일 경과 계정으로 로그인|89일 경과 계정으로 로그인)/.test(text)) {
    steps.push(`And 아이디에 '${testDataValue || "AUTOQA_USER"}' 입력한다`);
    steps.push(`And 비밀번호에 '${shouldUseInvalidPassword(record) ? "AUTOQA_INVALID_PASSWORD" : (testDataValue || "AUTOQA_PASSWORD")}' 입력한다`);
    steps.push("And 로그인 버튼을 클릭한다");
  }

  if (/상품 상세 페이지 접근 시도/.test(text)) {
    steps.push("And 상품 상세 페이지로 이동한다");
  }

  if (/주문 진행 시도/.test(text)) {
    steps.push("And 주문 버튼을 클릭한다");
  }

  if (/페이지 접근 시도|URL 직접 접근/.test(text)) {
    const route = inferProtectedRoute(record, scenario);
    if (route) steps.push(`And ${route} 페이지로 이동한다`);
  }

  if (/연장 버튼 클릭/.test(text)) {
    steps.push("And 연장 버튼을 클릭한다");
  }

  if (/재설정 완료 버튼 클릭|재설정 버튼 클릭/.test(text)) {
    steps.push("And 재설정 버튼을 클릭한다");
  }

  if (/다음에 변경하기 버튼 클릭/.test(text)) {
    steps.push("And 다음에 변경하기 버튼을 클릭한다");
  }

  if (/지금 변경하기 버튼 클릭/.test(text)) {
    steps.push("And 지금 변경하기 버튼을 클릭한다");
  }

  if (/인증번호 발송/.test(text)) {
    steps.push(`And 사업자등록번호에 '${testDataValue || "AUTOQA_BIZNO"}' 입력한다`);
    steps.push("And 인증번호 발송 버튼을 클릭한다");
  }

  if (/5분 경과|4분 59초/.test(text)) {
    steps.push(`And ${inferWaitMilliseconds(text)}초 기다린다`);
  }

  if (/인증번호 입력/.test(text)) {
    steps.push("And 인증번호에 '000000' 입력한다");
  }

  if (/확인 버튼 클릭/.test(text)) {
    steps.push("And 확인 버튼을 클릭한다");
  }

  return dedupeSteps(steps);
}

function inferTestCaseAssertionSteps(record, scenario) {
  const text = collectTestCaseText(record, scenario);
  const assertions = [];

  if (/리다이렉트|로그인 페이지로 이동/.test(text)) {
    assertions.push("Then 로그인 텍스트가 보인다");
  }
  if (/GUEST/.test(text)) {
    assertions.push("Then GUEST 텍스트가 보인다");
  }
  if (/상품 상세 조회 및 주문 불가|주문 불가|접근 불가/.test(text)) {
    assertions.push("Then 권한 텍스트가 보인다");
  }
  if (/존재하지 않음|에러 메시지/.test(text)) {
    assertions.push("Then 에러 텍스트가 보인다");
  }
  if (/정지 안내 메시지/.test(text)) {
    assertions.push("Then 정지 텍스트가 보인다");
  }
  if (/잠금 미발생/.test(text)) {
    assertions.push("Then 로그인 텍스트가 보인다");
  }
  if (/잠금 처리|접근 제한/.test(text)) {
    assertions.push("Then 잠금 텍스트가 보인다");
  }
  if (/차단|에러 페이지/.test(text)) {
    assertions.push("Then 차단 텍스트가 보인다");
  }
  if (/메인 페이지/.test(text)) {
    assertions.push("Then 메인 텍스트가 보인다");
  }
  if (/전자서명 페이지/.test(text)) {
    assertions.push("Then 전자서명 텍스트가 보인다");
  }
  if (/비밀번호 재설정 페이지/.test(text)) {
    assertions.push("Then 비밀번호 재설정 텍스트가 보인다");
  }
  if (/알림 미노출/.test(text)) {
    assertions.push("Then 메인 텍스트가 보인다");
  }
  if (/알림 노출/.test(text)) {
    assertions.push("Then 알림 텍스트가 보인다");
  }

  return dedupeSteps(assertions);
}

function inferScenarioNavigationSteps(record) {
  const route = inferScenarioRoute(record);
  return route ? [`When ${route} 페이지로 이동한다`] : [];
}

function inferScenarioInteractionSteps(record) {
  const text = collectScenarioText(record);
  const steps = [];

  if (/(로그인 성공|로그인된다|로그인 불가|GUEST 로그인|계정 잠금|해외 IP 접근 차단)/.test(text)) {
    steps.push("And 아이디에 'AUTOQA_USER' 입력한다");
    steps.push("And 비밀번호에 'AUTOQA_PASSWORD' 입력한다");
    steps.push("And 로그인 버튼을 클릭한다");
  }

  if (/다음에 변경하기/.test(text)) {
    steps.push("And 다음에 변경하기 버튼을 클릭한다");
  }

  if (/비밀번호 재설정 버튼 클릭/.test(text)) {
    steps.push("And 비밀번호 재설정 버튼을 클릭한다");
  }

  return steps;
}

function inferScenarioAssertionSteps(record) {
  const text = collectScenarioText(record);
  const assertions = [];

  if (/UI\/UX/.test(text)) {
    const screenKeyword = inferVisibleTextFromScenario(record);
    if (screenKeyword) assertions.push(`Then ${screenKeyword} 텍스트가 보인다`);
    return assertions;
  }

  if (/(로그인 성공|정상 로그인|플랫폼 메인에 정상 접근)/.test(text)) {
    assertions.push("Then 메인 텍스트가 보인다");
  } else if (/GUEST/.test(text)) {
    assertions.push("Then GUEST 텍스트가 보인다");
  } else if (/차단/.test(text)) {
    assertions.push("Then 차단 텍스트가 보인다");
  } else if (/잠금/.test(text)) {
    assertions.push("Then 잠금 텍스트가 보인다");
  } else if (/만료/.test(text)) {
    assertions.push("Then 만료 텍스트가 보인다");
  } else if (/전자서명/.test(text)) {
    assertions.push("Then 전자서명 텍스트가 보인다");
  } else if (/비밀번호 재설정/.test(text)) {
    assertions.push("Then 비밀번호 재설정 텍스트가 보인다");
  } else if (/아이디 찾기/.test(text)) {
    assertions.push("Then 아이디 찾기 텍스트가 보인다");
  } else if (/비밀번호 찾기/.test(text)) {
    assertions.push("Then 비밀번호 찾기 텍스트가 보인다");
  } else if (/알림/.test(text)) {
    assertions.push("Then 알림 텍스트가 보인다");
  }

  if (!assertions.length) {
    const fallback = inferVisibleTextFromScenario(record);
    if (fallback) assertions.push(`Then ${fallback} 텍스트가 보인다`);
  }

  if (!assertions.length) {
    assertions.push(`Then ${record.name || record.scenarioId} 관련 케이스를 확인한다`);
  }

  return assertions;
}

function convertActionStep(step, record) {
  const targetValue = extractInputValue(record.testData);

  const pageEntryMatch = step.match(/^(.+?)\s*(?:페이지|화면)\s*(?:직접\s*URL\s*)?(?:접근\s*시도|진입)$/);
  if (pageEntryMatch) {
    const pageTarget = normalizePageTarget(pageEntryMatch[1]);
    if (pageTarget) {
      return `When ${pageTarget} 페이지로 이동한다`;
    }
  }

  if (/버튼\s*클릭$/.test(step)) {
    return `When ${step.replace(/\s*클릭$/, "").trim()}을 클릭한다`;
  }

  const buttonClickMatch = step.match(/^(.+?)\s*클릭$/);
  if (buttonClickMatch) {
    return `When ${buttonClickMatch[1].trim()} 버튼을 클릭한다`;
  }

  const tabClickMatch = step.match(/^(.+?)\s*(?:탭|메뉴|링크)\s*클릭$/);
  if (tabClickMatch) {
    return `When ${tabClickMatch[1].trim()}을 클릭한다`;
  }

  const optionSelectMatch = step.match(/^(.+?)\s*방식\s*선택$/);
  if (optionSelectMatch) {
    return `When ${optionSelectMatch[1].trim()} 버튼을 클릭한다`;
  }

  const explicitSelectMatch = step.match(/^(.+?)\s*(?:선택|체크)$/);
  if (explicitSelectMatch && targetValue) {
    return `When ${explicitSelectMatch[1].trim()}에서 '${targetValue}' 을 선택한다`;
  }

  const fillMatch = step.match(/^(.+?)\s*(?:입력|기입)$/);
  if (fillMatch && targetValue) {
    return `When ${fillMatch[1].trim()}에 '${targetValue}' 입력한다`;
  }

  if (/스크롤을\s*끝까지\s*내림$/.test(step)) {
    return "When 페이지를 끝까지 스크롤한다";
  }

  if (/페이지\s*(?:직접\s*URL\s*접근\s*시도|진입)$/.test(step) || /화면\s*확인$/.test(step) || /이동\s*경로\s*확인$/.test(step)) {
    const visibleText = inferVisibleText(record);
    return visibleText ? `Then ${visibleText} 텍스트가 보인다` : "";
  }

  const dataValue = extractAssertionValue(record.testData);
  if (/약정서\s*내\s*.+\s*확인$/.test(step) && dataValue) {
    return `Then ${dataValue} 텍스트가 보인다`;
  }

  if (/타이머\s*표시\s*여부\s*확인$/.test(step) || /타이머\s*값\s*확인$/.test(step) || /타이머\s*초기화\s*여부\s*확인$/.test(step)) {
    return "Then 타이머 텍스트가 보인다";
  }

  if (/문의하기\s*버튼\s*노출\s*여부\s*확인$/.test(step) || /문의하기\s*버튼\s*및\s*주변\s*UI\s*레이아웃\s*확인$/.test(step)) {
    return "Then 문의하기 텍스트가 보인다";
  }

  if (/신규\s*약정서\s*로드\s*여부\s*확인$/.test(step)) {
    return "Then 거래약정서 텍스트가 보인다";
  }

  if (/서명\s*버튼\s*상태\s*확인$/.test(step)) {
    return "";
  }

  return "";
}

function normalizeScenarioDescriptionStep(step) {
  const text = String(step || "").trim();
  if (!text) return "시나리오 설명을 확인한다";

  const normalized = text
    .replace(/^(올바른|유효한)\s+/g, "")
    .replace(/\s+시\s+/g, " ")
    .replace(/\s+후\s+/g, " 후 ")
    .replace(/된다\.$/, "된다")
    .replace(/없다\.$/, "없다")
    .replace(/한다\.$/, "한다")
    .replace(/\.$/, "");

  if (/정상\s*로그인/.test(normalized)) {
    return "정상 로그인된다";
  }
  if (/강제\s*이동/.test(normalized)) {
    return "강제 이동된다";
  }
  if (/차단/.test(normalized)) {
    return "차단된다";
  }
  if (/노출/.test(normalized)) {
    return "메시지 또는 화면이 노출된다";
  }

  return normalized;
}

function collectScenarioText(record) {
  return [
    record.name,
    record.description,
    record.precondition,
    record.suite,
    record.domain,
    record.platform
  ].filter(Boolean).join(" ");
}

function inferScenarioRoute(record) {
  const text = collectScenarioText(record);

  if (/로그인|전자서명|비밀번호 정기 변경 알림/.test(text)) return "/login";
  if (/아이디 찾기/.test(text)) return "/find-id";
  if (/비밀번호 찾기/.test(text)) return "/find-password";
  if (/비밀번호 재설정/.test(text)) return "/reset-password";
  return "";
}

function inferTestCaseRoute(record, scenario) {
  const text = collectTestCaseText(record, scenario);
  if (/로그인|전자서명|비밀번호 정기 변경 알림/.test(text)) return "/login";
  if (/아이디 찾기/.test(text)) return "/find-id";
  if (/비밀번호 찾기/.test(text)) return "/find-password";
  if (/비밀번호 재설정/.test(text)) return "/reset-password";
  if (/BOS/.test(text)) return "/bos";
  return "";
}

function inferProtectedRoute(record, scenario) {
  const text = collectTestCaseText(record, scenario);
  if (/메인 페이지/.test(text)) return "/";
  if (/상품 상세/.test(text)) return "/products/detail";
  if (/주문/.test(text)) return "/order";
  if (/전자서명 페이지/.test(text)) return "/agreement";
  return "";
}

function collectTestCaseText(record, scenario) {
  return [
    record.name,
    record.precondition,
    record.steps,
    record.expectedResult,
    record.testData,
    scenario?.name,
    scenario?.description
  ].filter(Boolean).join(" ");
}

function shouldUseInvalidPassword(record) {
  const text = collectTestCaseText(record, {});
  return /잘못된 비밀번호|로그인 실패|존재하지 않음/.test(text);
}

function inferWaitMilliseconds(text) {
  if (/4분 59초/.test(text)) return 299;
  if (/5분/.test(text)) return 300;
  return 1;
}

function toStepLines(value, prefix) {
  const parts = splitStepLines(value);
  if (!parts.length) return [];

  return parts.map((part, index) => `${index === 0 ? prefix : "And"} ${part}`);
}

function splitStepLines(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => line.split(/\s+\/\s+/))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line && line !== "-");
}

function dedupeSteps(steps) {
  return Array.from(new Set(steps.filter(Boolean)));
}

function extractDataValue(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return "";
  const match = text.match(/:\s*(.+)$/);
  return (match ? match[1] : text).trim();
}

function extractAssertionValue(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return "";
  if (/:\s*/.test(text)) {
    return extractDataValue(text);
  }
  if (/계정|파일|응답|Timeout|Mock/i.test(text)) {
    return "";
  }
  return text;
}

function extractInputValue(value) {
  const text = extractAssertionValue(value);
  if (!text) return "";
  if (/[\/,]/.test(text)) return "";
  if (/계정|회원|사용자|파일|응답|Timeout|Mock/i.test(text)) return "";
  return text;
}

function normalizePageTarget(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text) || text.startsWith("/")) return text;
  if (text === "홈" || /메인/.test(text)) return "/";
  return "";
}

function inferVisibleText(record) {
  const testDataValue = extractAssertionValue(record.testData);
  if (testDataValue) return testDataValue;

  const expected = String(record.expectedResult || "");
  const title = String(record.name || "");
  const screenName = String(record.screenName || "");
  const keywords = [
    "비밀번호 재설정",
    "문의하기",
    "재시도",
    "카카오채널",
    "링크 재생성",
    "전자서명",
    "거래약정서",
    "메인",
    "타이머"
  ];

  for (const keyword of keywords) {
    if (expected.includes(keyword) || title.includes(keyword) || screenName.includes(keyword)) {
      return keyword;
    }
  }

  return screenName || "";
}

function inferVisibleTextFromScenario(record) {
  const text = collectScenarioText(record);
  const keywords = [
    "로그인",
    "GUEST",
    "전자서명",
    "비밀번호 재설정",
    "아이디 찾기",
    "비밀번호 찾기",
    "알림",
    "잠금",
    "차단",
    "만료",
    "메인"
  ];

  for (const keyword of keywords) {
    if (text.includes(keyword)) return keyword;
  }

  return String(record.name || "").trim();
}

function formatTag(value) {
  return String(value).replace(/[\[\],]/g, " ").trim();
}

function compact(items) {
  return items.filter(Boolean);
}

function normalizeCell(value) {
  return String(value || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

function isSpreadsheetFile(filePath) {
  return [".xlsx", ".xls"].includes(path.extname(filePath).toLowerCase());
}

function isStructuredScenarioFile(filePath) {
  return [".csv", ".xlsx", ".xls"].includes(path.extname(filePath).toLowerCase());
}

function findCompanionWorkbook(filePath, targetType) {
  const basename = path.basename(filePath);
  const dirname = path.dirname(filePath);
  const candidates = targetType === "scenario"
    ? [
      basename.replace("QA테스트케이스", "QA시나리오"),
      basename.replace("테스트케이스", "시나리오")
    ]
    : [
      basename.replace("QA시나리오", "QA테스트케이스"),
      basename.replace("시나리오", "테스트케이스")
    ];

  for (const candidate of candidates) {
    if (candidate !== basename) {
      const resolved = path.join(dirname, candidate);
      try {
        XLSX.readFile(resolved, { sheetRows: 1 });
        return resolved;
      } catch {
        // Ignore invalid companion candidates.
      }
    }
  }

  return "";
}

module.exports = {
  extractScenarioMarkdownFromStructuredFile,
  loadScenarioFileContent
};
