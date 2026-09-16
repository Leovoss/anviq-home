// Regression suite for Sherlock's deterministic first-pass matching.
// These are visitor phrasings, not internal command syntax. Keep new cases
// here whenever a real question is missed or misclassified.
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
const { findLocalSherlockIntent } = await server.ssrLoadModule("/src/lib/sherlockCorpus.ts");
const { pageGuide } = await server.ssrLoadModule("/src/lib/sherlockGuide.ts");
const { inferVisitorMode } = await server.ssrLoadModule("/src/lib/sherlockJourney.ts");
await server.close();

const cases = [
  ["Projects?", "projects"],
  ["Work?", "projects"],
  ["What have you built?", "projects"],
  ["Show me a case study", "projects"],
  ["About?", "anviq"],
  ["Tell me about Anviq", "anviq"],
  ["What services do you offer?", "services"],
  ["Can you automate our manual process?", "automation"],
  ["We copy data between systems all day", "manual-work"],
  ["Can you build an internal tool?", "internal-tool"],
  ["We need a dashboard", "dashboard"],
  ["Can you import our CSV files?", "data-import"],
  ["We need permissions for different staff", "roles"],
  ["Can it send automatic reminders?", "notifications"],
  ["Does it work on a phone?", "mobile-product"],
  ["Our old system is broken", "legacy-fix"],
  ["We need an approval workflow", "approval"],
  ["Can you help with our sales pipeline?", "sales-process"],
  ["We need this quickly", "urgent"],
  ["I don't know where to start", "not-sure"],
  ["Have you built something like this?", "project-fit"],
  ["How much would this cost?", "price"],
  ["Can I speak to Leonardo?", "human"],
  ["How do we get started?", "start"],
  ["What should I look at next?", "returning"],
  ["How do you protect our data?", "privacy"],
  ["Do we own the code?", "ownership"],
  ["What happens after launch?", "support"],
  ["Can Steadyward trade?", "broker-safety"],
  ["How do Anviq Agents stay safe?", "agents-safety"],
];

let failures = 0;
for (const [question, expected] of cases) {
  const actual = findLocalSherlockIntent(question)?.id;
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL ${JSON.stringify(question)} -> ${actual ?? "no match"}; expected ${expected}`);
  }
}

if (failures) {
  console.error(`\n${failures}/${cases.length} Sherlock checks failed.`);
  process.exit(1);
}
const servicesGuide = pageGuide("/services", new Set(["/projects", "/services"]));
if (servicesGuide.next.path !== "/approach" || !servicesGuide.text.includes("Selected work")) {
  console.error("FAIL page-aware guidance: Services should remember Selected work and lead to Approach.");
  process.exit(1);
}
const engagementGuide = pageGuide("/engagement", new Set(["/projects", "/services", "/approach", "/engagement"]));
if (engagementGuide.next.path !== "/contact/calendly") {
  console.error("FAIL conversion guidance: Engagement should lead to Book a call.");
  process.exit(1);
}
const trustMode = inferVisitorMode("We have sensitive customer data and need an NDA");
const trustGuide = pageGuide("/projects", new Set(["/projects"]), ["/services", "/projects"], trustMode);
if (trustMode !== "trust" || trustGuide.next.path !== "/constraints" || trustGuide.previous?.path !== "/services") {
  console.error("FAIL visitor-state guidance: trust concerns should preserve the actual prior page and lead to the relevant safeguards.");
  process.exit(1);
}
const readyMode = inferVisitorMode("Can we book a call to discuss the budget?");
const readyGuide = pageGuide("/services", new Set(["/services"]), ["/projects", "/services"], readyMode);
if (readyMode !== "ready" || readyGuide.next.path !== "/contact/calendly") {
  console.error("FAIL visitor-state guidance: booking intent should lead to the calendar.");
  process.exit(1);
}
console.log(`OK: ${cases.length} ordinary visitor questions and 4 page-aware sales journeys pass.`);
