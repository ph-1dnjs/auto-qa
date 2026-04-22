function splitList(value) {
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseScenarioText(input) {
  const text = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  if (text.startsWith("[") || text.startsWith("{")) {
    return parseJsonScenarios(text);
  }

  const blocks = text
    .split(/\n(?=#{1,3}\s*시나리오:|\n?Scenario:|\n?시나리오:)/i)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => parseMarkdownScenario(block, index));
}

function parseJsonScenarios(text) {
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : parsed.scenarios || [];
  return items.map((item, index) => ({
    id: item.id || `scenario-${index + 1}`,
    title: item.title || item.name || `Scenario ${index + 1}`,
    priority: item.priority || "Medium",
    tags: item.tags || [],
    steps: (item.steps || []).map((step) =>
      typeof step === "string" ? parseNaturalLanguageStep(step) : step
    )
  }));
}

function parseMarkdownScenario(block, index) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let title = `Scenario ${index + 1}`;
  let priority = "Medium";
  let tags = [];
  const steps = [];

  for (const line of lines) {
    const titleMatch = line.match(/^(?:#{1,3}\s*)?(?:시나리오|Scenario)\s*:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }

    const priorityMatch = line.match(/^priority\s*:\s*(.+)$/i);
    if (priorityMatch) {
      priority = priorityMatch[1].trim();
      continue;
    }

    const tagsMatch = line.match(/^tags\s*:\s*(.+)$/i);
    if (tagsMatch) {
      tags = splitList(tagsMatch[1].trim());
      continue;
    }

    if (/^(Given|When|Then|And|But)\b/i.test(line)) {
      steps.push(parseNaturalLanguageStep(line.replace(/^(Given|When|Then|And|But)\s+/i, "")));
    }
  }

  return {
    id: `scenario-${index + 1}`,
    title,
    priority,
    tags,
    steps
  };
}

function parseNaturalLanguageStep(line) {
  const step = line.trim();

  let match = step.match(/^(.+?)\s*페이지(?:로|에)?\s*이동한다$/);
  if (match) {
    return { action: "goto", target: match[1].trim() };
  }

  match = step.match(/^(.+?)\s*(?:을|를)\s*['"](.+?)['"]\s*(?:으로|로)\s*입력한다$/);
  if (match) {
    return { action: "fill", target: match[1].trim(), value: match[2] };
  }

  match = step.match(/^(.+?)\s*(?:에서|을|를)\s*['"](.+?)['"]\s*(?:을|를)?\s*(?:으로|로)?\s*선택한다$/);
  if (match) {
    return { action: "select", target: match[1].trim(), value: match[2] };
  }

  match = step.match(/^(.+?)\s*(?:버튼을\s*)?클릭하여\s*(?:파일을\s*)?다운로드한다$/);
  if (match) {
    return { action: "download", target: match[1].trim().replace(/\s*버튼$/, "") };
  }

  match = step.match(/^(.+?)\s*(?:파일을\s*)?다운로드한다$/);
  if (match) {
    return { action: "download", target: match[1].trim().replace(/\s*버튼$/, "") };
  }

  match = step.match(/^(.+?)\s*(?:버튼을\s*)?클릭한다$/);
  if (match) {
    return { action: "click", target: match[1].trim().replace(/\s*버튼$/, "") };
  }

  match = step.match(/^(.+?)\s*(?:텍스트가\s*)?보인다$/);
  if (match) {
    return { action: "expectText", target: match[1].trim() };
  }

  match = step.match(/^URL에\s*['"]?(.+?)['"]?\s*(?:가|이)?\s*포함된다$/i);
  if (match) {
    return { action: "expectUrlContains", value: match[1].trim() };
  }

  match = step.match(/^(\d+)\s*초\s*기다린다$/);
  if (match) {
    return { action: "wait", value: Number(match[1]) * 1000 };
  }

  return { action: "note", target: step };
}

module.exports = {
  parseScenarioText,
  parseNaturalLanguageStep
};
