// Browser-level regression check for the owner's Prompt 7 terminal repro.
// Run against `npm run dev -- --port 5173` or pass a URL as argv[2].
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const chrome =
  process.env.CHROME ||
  path.join(process.env.LOCALAPPDATA, "ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const url = process.argv[2] || "http://127.0.0.1:5173/";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const evidence = path.join(root, "scripts", "prompt7-evidence");
fs.mkdirSync(evidence, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "anviq-terminal-check-"));
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  userDataDir: profile,
  args: ["--disable-crash-reporter", "--disable-breakpad", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const rows = [];
function check(step, ok, detail) {
  rows.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${step} — ${detail}`);
}
async function run(command) {
  const input = await page.waitForSelector(".terminal-form input");
  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await input.type(command);
  await page.keyboard.press("Enter");
  await new Promise((resolve) => setTimeout(resolve, 100));
}

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.click(".terminal-trigger");
await page.waitForSelector(".terminal-window");
const radii = await page.evaluate(() => ({
  terminal: getComputedStyle(document.querySelector(".terminal-window")).borderRadius,
  finder: getComputedStyle(document.querySelector(".explorer-window")).borderRadius,
  terminalCornerShape: getComputedStyle(document.querySelector(".terminal-window")).cornerShape,
}));
check("terminal chrome radius is 9px; Finder board is 16px", radii.terminal === "9px" && radii.finder === "16px", JSON.stringify(radii));
const typingBeforeSkip = await page.$(".persona-text.is-typing");
check("persona line begins typing", !!typingBeforeSkip, typingBeforeSkip ? "active" : "missing");
await page.keyboard.press("Space");
const typingAfterSkip = await page.$(".persona-text.is-typing");
check("keypress completes persona line", !typingAfterSkip, typingAfterSkip ? "still active" : "complete");

await run("cd Selected work");
const cwdAfterCd = await page.$eval(".terminal-titlebar > .terminal-titlebar-copy > span", (el) => el.textContent);
check("cd Selected work resolves folder", cwdAfterCd?.includes("/projects") ?? false, cwdAfterCd ?? "missing cwd");
check("cd Selected work changes URL", page.url().endsWith("/explore/projects"), page.url());

await run("ls");
const rootListing = await page.$eval(".terminal-output", (el) => el.innerText);
check("ls at Selected work lists project files", ["Steadyward", "LV Matching", "Addreach", "Automated Recruitment CRM"].every((name) => rootListing.includes(name)), rootListing.slice(-220));

await run("cd steadyward");
const afterFileCd = await page.$eval(".terminal-output", (el) => el.innerText);
check("cd steadyward refuses a file", afterFileCd.includes("cd: not a folder: steadyward"), afterFileCd.slice(-160));

const before = page.url();
await run("open steadyward");
const after = page.url();
check("open steadyward changes URL", after.endsWith("/projects/steadyward") && after !== before, `${before} -> ${after}`);
await page.goBack({ waitUntil: "domcontentloaded" });
check("browser history returns to prior route", page.url() === before, `${after} -> ${page.url()}`);
await page.screenshot({ path: path.join(evidence, "terminal-owner-repro.png") });

await browser.close();
fs.rmSync(profile, { recursive: true, force: true });
if (rows.some((row) => !row.ok)) process.exit(1);
