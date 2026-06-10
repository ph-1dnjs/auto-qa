function normalizeCommandToken(value) {
  return String(value || "").trim().toLowerCase();
}

function stripLeadingSlash(value) {
  return value.replace(/^\/+/, "");
}

function getCommandExactTokens(command) {
  const values = [command.command, ...(command.aliases || [])];
  const tokens = new Set();
  values.forEach((value) => {
    const normalized = normalizeCommandToken(value);
    if (!normalized) return;
    tokens.add(normalized);
    tokens.add(stripLeadingSlash(normalized));
  });
  return tokens;
}

function getCommandSearchTokens(command) {
  const values = [
    command.command,
    ...(command.aliases || []),
    command.title,
    command.description,
    ...(command.keywords || []),
  ];
  const tokens = new Set();
  values.forEach((value) => {
    const normalized = normalizeCommandToken(value);
    if (!normalized) return;
    tokens.add(normalized);
    tokens.add(stripLeadingSlash(normalized));
  });
  return [...tokens];
}

function isLikelyHttpUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  return /^(localhost|[a-z0-9-]+(\.[a-z0-9-]+)+|(\d{1,3}\.){3}\d{1,3}|\[[0-9a-f:]+\]|[a-z0-9-]+:\d+)(\/.*)?$/i.test(value);
}

export function normalizeHomePromptUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!isLikelyHttpUrl(value)) {
    return null;
  }
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveHomePromptCommand(commands, rawValue) {
  const normalized = normalizeCommandToken(rawValue);
  if (!normalized) return null;
  const bare = stripLeadingSlash(normalized);
  return commands.find((command) => {
    const tokens = getCommandExactTokens(command);
    return tokens.has(normalized) || tokens.has(bare);
  }) || null;
}

export function getFilteredHomePromptCommands(commands, rawValue) {
  const normalized = stripLeadingSlash(normalizeCommandToken(rawValue));
  if (!normalized) return commands;

  const startsWithMatches = [];
  const includesMatches = [];

  commands.forEach((command) => {
    const tokens = getCommandSearchTokens(command);
    if (tokens.some((token) => token.startsWith(normalized))) {
      startsWithMatches.push(command);
      return;
    }
    if (tokens.some((token) => token.includes(normalized))) {
      includesMatches.push(command);
    }
  });

  return [...startsWithMatches, ...includesMatches];
}

export function getFilteredHomePromptUrls(historyItems, rawValue) {
  const normalized = normalizeCommandToken(rawValue);
  if (!normalized) return [];

  const exactMatches = [];
  const startsWithMatches = [];
  const includesMatches = [];

  historyItems.forEach((item) => {
    const url = String(item?.url || "").trim();
    if (!url) return;
    const haystack = url.toLowerCase();
    if (haystack === normalized) {
      exactMatches.push(item);
      return;
    }
    if (haystack.startsWith(normalized)) {
      startsWithMatches.push(item);
      return;
    }
    if (haystack.includes(normalized)) {
      includesMatches.push(item);
    }
  });

  return [...exactMatches, ...startsWithMatches, ...includesMatches];
}

export function shouldSuggestHomePromptCommands(commands, rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return false;
  if (normalizeHomePromptUrl(value)) return false;
  return getFilteredHomePromptCommands(commands, value).length > 0;
}
