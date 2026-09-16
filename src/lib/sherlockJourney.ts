// A small, inspectable sales-state model. It does not generate copy or infer
// facts: it only chooses which real page is most useful after a visitor gives
// Sherlock a clue about their stage.
export type VisitorMode = "exploring" | "problem" | "proof" | "trust" | "ready";

export function inferVisitorMode(query: string, current: VisitorMode = "exploring"): VisitorMode {
  const value = query.toLowerCase();
  if (/\b(book|booking|calendar|calendly|meeting|call|talk|contact|price|pricing|cost|budget|quote|proposal|timeline|start)\b/.test(value)) return "ready";
  if (/\b(security|secure|privacy|gdpr|compliance|nda|confidential|ownership|own|hosting|data|audit|risk|safe)\b/.test(value)) return "trust";
  if (/\b(project|projects|case study|case studies|example|examples|proof|evidence|built|portfolio|work)\b/.test(value)) return "proof";
  if (/\b(my|our|we|workflow|process|manual|spreadsheet|handoff|integration|automate|automation|broken|slow|messy|problem)\b/.test(value)) return "problem";
  return current;
}

export function preferredPathsFor(mode: VisitorMode): string[] {
  switch (mode) {
    case "problem": return ["/services", "/approach", "/contact/calendly"];
    case "proof": return ["/projects", "/services", "/contact/calendly"];
    case "trust": return ["/constraints", "/engagement", "/contact/calendly"];
    case "ready": return ["/contact/calendly", "/engagement", "/questions"];
    default: return [];
  }
}
