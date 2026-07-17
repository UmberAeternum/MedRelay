const PROHIBITED_PATTERNS: Array<[string, RegExp]> = [
  ["confirmed diagnosis", /\b(?:diagnosis is|diagnosed with|confirmed diagnosis|definitely have|certainly have|likely have)\b/i],
  ["diagnostic probability", /\b\d{1,3}\s*%\s*(?:chance|probability|confidence)\b/i],
  ["prescription", /\b(?:i prescribe|we prescribe|start taking|take \d+(?:\.\d+)?\s*(?:mg|ml)|increase (?:your )?dose|decrease (?:your )?dose|stop taking)\b/i],
  ["completed clinician review", /\b(?:clinician|doctor) (?:has |already )?reviewed\b/i],
  ["automatic booking", /\b(?:appointment (?:is|has been) booked|i booked|we booked)\b/i],
  ["emergency dispatch", /\b(?:ambulance|emergency services) (?:has been|were|was) dispatched\b/i],
];

export function semanticBoundaryViolations(texts: string[]): string[] {
  const combined = texts.join("\n");
  return PROHIBITED_PATTERNS.filter(([, pattern]) => pattern.test(combined)).map(
    ([label]) => label
  );
}

export function isSemanticallySafe(texts: string[]): boolean {
  return semanticBoundaryViolations(texts).length === 0;
}

