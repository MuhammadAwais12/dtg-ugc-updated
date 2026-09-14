export function normalizeCreatorCode(input: string): string {
  if (!input) return "";
  // Matches CR followed by optional spaces, optional dash, optional spaces, and 1+ digits
  const match = input.match(/CR\s*-?\s*(\d+)/i);
  if (!match) {
    return input.trim().toUpperCase();
  }
  const digits = match[1];
  return `CR-${digits}`;
}

export function extractCreatorName(adName: string, fallbackName: string): string {
  if (!adName) return fallbackName;

  // 1. Check if name is in brackets like [Evie Kevish] or [Elle Sneller]
  const bracketMatch = adName.match(/\[(.*?)\]/);
  if (bracketMatch && bracketMatch[1].trim()) {
    return bracketMatch[1].trim();
  }

  // 2. Strip leading CR-### or code patterns (e.g. "CR-100 | ", "CR - 226 | ")
  let cleaned = adName.replace(/^\s*CR\s*-?\s*\d+\s*[|\-]?\s*/i, "").trim();

  // 3. If pipe-separated, check segments
  const pipeParts = cleaned.split("|").map((p) => p.trim()).filter(Boolean);
  if (pipeParts.length > 1) {
    // If the last segment is a creator name (e.g. "Frazer Page"), prefer it
    const lastPart = pipeParts[pipeParts.length - 1];
    const isMonthOrCommonTag = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|shoes|mat|all|partnership|copy|iteration)/i.test(lastPart);
    if (!isMonthOrCommonTag && lastPart.length > 2 && !/^\d+$/.test(lastPart)) {
      return lastPart;
    }
    // Check first part if not a month/number
    const firstPart = pipeParts[0];
    const isFirstMonth = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(firstPart);
    if (!isFirstMonth && firstPart.length > 2 && !/^\d+$/.test(firstPart)) {
      return firstPart.split("-")[0].trim();
    }
  }

  // 4. Split by dash to separate creator name from dates/tags
  const dashParts = cleaned.split("-").map((p) => p.trim()).filter(Boolean);
  if (dashParts.length > 0) {
    // If last part after dash has a person's name or code
    for (let i = dashParts.length - 1; i >= 0; i--) {
      const part = dashParts[i];
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(part)) {
        return part;
      }
    }
    const candidate = dashParts[0];
    const isMonth = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(candidate);
    if (!isMonth && candidate.length > 1) {
      return candidate;
    }
  }

  return fallbackName;
}
