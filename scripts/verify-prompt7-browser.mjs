// Live Prompt 7 checks against the running Vite server. Uses puppeteer-core
// against the locally cached Playwright Chromium. Not part of CI.

import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const chrome =
  process.env.CHROME ||
  path.join(
    process.env.LOCALAPPDATA,
    "ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  );
const url = process.argv[2] || "http://localhost:5173/";
const outDir = path.join(root, "scripts", "prompt7-evidence");
fs.mkdirSync(outDir, { recursive: true });

function contrast(fg, bg) {
  const lum = (c) => {
    const s = c.map((v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  };
  const L1 = lum(fg);
  const L2 = lum(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

const log = [];
function check(label, ok, detail) {
  log.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
}

await page.goto(url, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });

const badge = await page.$eval(".sherlock-badge", (el) => el.textContent.trim()).catch(() => null);
check("fresh-profile badge numeral 1", badge === "1", `got ${badge}`);

const aria = await page.$eval(".terminal-trigger", (el) => el.getAttribute("aria-label"));
check(
  "badge accessible name",
  (aria || "").includes("you haven't met yet") && (aria || "").includes("1 pending"),
  aria,
);

await page.click(".terminal-trigger");
await page.waitForSelector(".terminal-window");

const greeting = await page.$eval(".terminal-output", (el) => el.innerText);
const badgeIdx = greeting.indexOf("That badge was up today. I counted. It's what I do.");
const r0Idx = greeting.indexOf("Sherlock, finder of things");
check(
  "badge greeting variant before R-0",
  badgeIdx >= 0 && r0Idx >= 0 && badgeIdx < r0Idx,
  greeting.slice(0, 280),
);

const badgeAfterOpen = await page.$(".sherlock-badge");
check("badge clears on first open", !badgeAfterOpen, badgeAfterOpen ? "still present" : "gone");

const bg = await page.$eval(".terminal-window", (el) => getComputedStyle(el).backgroundColor);
const bgRgb = parseRgb(bg);
const bgHex = bgRgb
  ? "#" + bgRgb.map((v) => v.toString(16).padStart(2, "0")).join("")
  : bg;
const delta = bgRgb
  ? Math.max(
      Math.abs(bgRgb[0] - 11),
      Math.abs(bgRgb[1] - 11),
      Math.abs(bgRgb[2] - 13),
    )
  : 99;
check(
  "terminal body #0b0b0d ±2",
  !!bgRgb && delta <= 2,
  `${bg} (${bgHex}) delta=${delta}`,
);

const blur = await page.$eval(".terminal-window", (el) => getComputedStyle(el).backdropFilter);
check("terminal window has no backdrop-filter", blur === "none", blur);

const dim = await page.$eval(".terminal-status", (el) => getComputedStyle(el).color);
const ghostProbe = await page.evaluate(() => {
  const el = document.querySelector(".terminal-window");
  const cs = getComputedStyle(el);
  return cs.getPropertyValue("--term-ghost").trim();
});
const dimRgb = parseRgb(dim);
const ghostRgb = ghostProbe.startsWith("#")
  ? [
      parseInt(ghostProbe.slice(1, 3), 16),
      parseInt(ghostProbe.slice(3, 5), 16),
      parseInt(ghostProbe.slice(5, 7), 16),
    ]
  : parseRgb(ghostProbe);
const dimRatio = dimRgb && bgRgb ? contrast(dimRgb, bgRgb) : 0;
const ghostRatio = ghostRgb && bgRgb ? contrast(ghostRgb, bgRgb) : 0;
check("dim text contrast ≥ 4.5:1", dimRatio >= 4.5, dimRatio.toFixed(2) + ` (${dim} on ${bg})`);
check("ghost token contrast ≥ 3:1", ghostRatio >= 3, ghostRatio.toFixed(2) + ` (${ghostProbe} on ${bg})`);

async function typeCommand(cmd) {
  const input = await page.waitForSelector(".terminal-form input");
  await input.click();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await input.type(cmd, { delay: 20 });
}

async function runCommand(cmd) {
  await typeCommand(cmd);
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 120));
}

await runCommand("ls");
const afterLs = await page.$eval(".terminal-output", (el) => el.innerText);
check("ls shows Selected work/", afterLs.includes("Selected work/"), afterLs.slice(-400));

await runCommand("cd Selected work");
const cwd = await page.$eval("#" + (await page.$eval(".terminal-titlebar", (el) => el.querySelector("[id]")?.id)), (el) => el.textContent);
check("cd Selected work updates title cwd", (cwd || "").includes("/projects"), cwd);

await runCommand("ls");
const inside = await page.$eval(".terminal-output", (el) => el.innerText);
check(
  "ls inside lists four project files",
  ["Steadyward", "LV Matching", "Addreach", "Automated Recruitment CRM"].every((n) =>
    inside.includes(n),
  ),
  inside.slice(-400),
);

const urlBefore = page.url();
await runCommand("open Steadyward");
await new Promise((r) => setTimeout(r, 200));
const urlAfter = page.url();
check(
  "open Steadyward changes URL",
  urlAfter.includes("/projects/steadyward") && urlAfter !== urlBefore,
  `${urlBefore} -> ${urlAfter}`,
);

await runCommand("sudo");
const afterSudo = await page.$eval(".terminal-output", (el) => el.innerText);
check(
  "sudo commentary verbatim",
  afterSudo.includes("There is no sudo here. The oaths are load-bearing."),
  afterSudo.slice(-300),
);

await runCommand("pwd");
const afterPwd = await page.$eval(".terminal-output", (el) => el.innerText);
check(
  "pwd output prints cwd (commentary may queue under joke cap)",
  afterPwd.includes("/projects$ pwd") && afterPwd.includes("/projects"),
  afterPwd.slice(-180),
);

await typeCommand("op");
await new Promise((r) => setTimeout(r, 80));
const ghostText = await page.$eval(".terminal-ghost-rest", (el) => el.textContent).catch(() => null);
check("op ghost rest is 'en steadyward'", ghostText === "en steadyward", JSON.stringify(ghostText));
const beforeTab = await page.$eval(".terminal-form input", (el) => el.value);
await page.keyboard.press("Tab");
await new Promise((r) => setTimeout(r, 40));
const afterTab = await page.$eval(".terminal-form input", (el) => el.value);
check(
  "Tab cycles to a completion",
  afterTab !== beforeTab && afterTab.toLowerCase().startsWith("open "),
  `${beforeTab} -> ${afterTab}`,
);
await page.keyboard.press("Tab");
await new Promise((r) => setTimeout(r, 40));
const afterTab2 = await page.$eval(".terminal-form input", (el) => el.value);
check("Tab cycles again", afterTab2 !== afterTab, `${afterTab} -> ${afterTab2}`);
await typeCommand("op");
await new Promise((r) => setTimeout(r, 80));
await page.keyboard.press("ArrowRight");
const filled = await page.$eval(".terminal-form input", (el) => el.value);
check("Right-arrow accepts ghost", filled === "open steadyward", filled);

await page.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 150));

await typeCommand("/");
await new Promise((r) => setTimeout(r, 80));
const slash = await page.$$eval(".terminal-slash li", (els) => els.map((el) => el.innerText));
check("slash overlay lists verbs", slash.some((t) => t.includes("/ls")) && slash.some((t) => t.includes("/open")), slash.join(" | "));
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 80));
const terminalStillOpen = await page.$(".terminal-window");
check("Esc in slash overlay does not close terminal", !!terminalStillOpen, terminalStillOpen ? "open" : "closed");
if (!terminalStillOpen) {
  await page.click(".terminal-trigger");
  await page.waitForSelector(".terminal-window");
}
const extraEmpty = await page.$(".terminal-suggest-row");
check("no suggest row on empty input", !extraEmpty, extraEmpty ? "present" : "absent");

const status1 = await page.$eval("[data-guide-status]", (el) => el.textContent);
await page.evaluate(() => {
  const link = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/explore/services");
  link?.click();
});
await new Promise((r) => setTimeout(r, 250));
const status2 = await page.$eval("[data-guide-status]", (el) => el.textContent);
const outputAfterNav = await page.$eval(".terminal-output", (el) => el.innerText);
check(
  "status updates without reopening",
  status2 !== status1 || outputAfterNav.includes("Three ways to hire him"),
  `status "${status1}" -> "${status2}"`,
);

await page.screenshot({ path: path.join(outDir, "terminal-black.png") });

// Idle hint: reduced-motion still uses the 20s timer. Skip waiting in CI-ish
// run; record as deferred if we don't want a 20s hang. We wait.
await new Promise((r) => setTimeout(r, 20500));
const afterIdle = await page.$eval(".terminal-output", (el) => el.innerText);
check("idle hint once after 20s", afterIdle.includes("Still here? Try a topic, or ls."), afterIdle.slice(-200));

await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 200));

// Mobile chip strip + badge
const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await mobile.goto(url, { waitUntil: "networkidle0" });
const mobileBadge = await mobile.$eval(".sherlock-badge", (el) => el.textContent.trim()).catch(() => "none");
check("mobile badge after desktop met is 0/gone or pending-only", mobileBadge === "none" || mobileBadge === "1", mobileBadge);

await mobile.click(".chat-trigger");
await mobile.waitForSelector(".chat-sheet");
await mobile.type(".chat-form input", "ste");
await new Promise((r) => setTimeout(r, 100));
const chips = await mobile.$$eval(".chat-starter-chips .chat-chip", (els) => els.map((el) => el.textContent.trim()));
check("mobile ste chips include Steadyward", chips.some((c) => /steadyward/i.test(c)), chips.join(", "));

await mobile.screenshot({ path: path.join(outDir, "mobile-chips.png") });
await mobile.click(".chat-titlebar .icon-button");
await mobile.waitForSelector(".chat-sheet", { hidden: true }).catch(() => {});
await new Promise((r) => setTimeout(r, 400));

const search = await mobile.$(".search-field-wrap input");
if (search) {
  await search.click({ delay: 20 });
  await mobile.keyboard.type("zzz", { delay: 40 });
  await new Promise((r) => setTimeout(r, 300));
  const debug = await mobile.evaluate(() => ({
    value: document.querySelector(".search-field-wrap input")?.value,
    active: document.activeElement === document.querySelector(".search-field-wrap input"),
    rescue: document.querySelector(".search-rescue")?.textContent ?? null,
    wrap: !!document.querySelector(".search-field-wrap"),
  }));
  check(
    "capsule zzz shows Sherlock rescue once",
    !!(debug.rescue && debug.rescue.includes("Nothing")),
    JSON.stringify(debug),
  );
  const clear = await mobile.$(".search-field-wrap button[aria-label='Clear search']");
  if (clear) await clear.click();
  await mobile.click(".search-field-wrap input");
  await mobile.keyboard.type("crm", { delay: 30 });
  await new Promise((r) => setTimeout(r, 200));
  const crmHits = await mobile.$$eval(".search-suggestions button strong", (els) =>
    els.map((el) => el.textContent.trim()),
  );
  check(
    "capsule crm narrows live",
    crmHits.some((title) => /recruitment|crm/i.test(title)),
    crmHits.join(", ") || "(no hits)",
  );
} else {
  check("capsule zzz shows Sherlock rescue once", false, "no search capsule on this viewport");
  check("capsule crm narrows live", false, "no search capsule");
}

async function commentaryContext(commands, asserts) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(url, { waitUntil: "networkidle0" });
  await p.evaluate(() => {
    localStorage.setItem(
      "anviq-guide-once",
      JSON.stringify([
        "met-sherlock",
        "greeting",
        "badge-pop",
        "badge-greeting",
        "return-visit",
        "multi-day-return",
      ]),
    );
    sessionStorage.setItem("anviq-guide-session", "1");
    localStorage.setItem("anviq-guide-last-visit-ms", String(Date.now()));
  });
  await p.reload({ waitUntil: "networkidle0" });
  await p.click(".terminal-trigger");
  await p.waitForSelector(".terminal-window");
  for (const cmd of commands) {
    const input = await p.waitForSelector(".terminal-form input");
    await input.click({ clickCount: 3 });
    await p.keyboard.press("Backspace");
    if (cmd) await input.type(cmd, { delay: 10 });
    await p.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 80));
  }
  const text = await p.$eval(".terminal-output", (el) => el.innerText);
  for (const [label, needle] of asserts) {
    check(label, text.includes(needle), text.slice(-400));
  }
  await ctx.close();
}

await commentaryContext(["pwd", "dir"], [
  ["pwd commentary", "You are here. It has rarely been truer."],
  ["alias commentary", "dir works. Sherlock doesn't judge. He notes."],
]);
await commentaryContext(["help", "help", "", "", ""], [
  ["help twice commentary", "Help, twice. Thorough or lost. Both welcome."],
  ["whitespace commentary", "Whitespace received. Acknowledged. Ignored."],
]);
await commentaryContext(["clear", "exit"], [
  ["clear commentary", "The scrollback forgets. Sherlock remembers. Briefly."],
  ["exit commentary", "There is no exit. There is only Esc."],
]);

const multi = await browser.createBrowserContext();
const mp = await multi.newPage();
await mp.setViewport({ width: 1440, height: 900 });
await mp.goto(url, { waitUntil: "networkidle0" });
await mp.evaluate(() => {
  localStorage.setItem(
    "anviq-guide-once",
    JSON.stringify(["met-sherlock", "greeting", "badge-pop", "badge-greeting"]),
  );
  localStorage.setItem("anviq-guide-last-visit-ms", String(Date.now() - 25 * 60 * 60 * 1000));
  sessionStorage.removeItem("anviq-guide-session");
});
await mp.reload({ waitUntil: "networkidle0" });
await mp.click(".terminal-trigger");
await mp.waitForSelector(".terminal-window");
await new Promise((r) => setTimeout(r, 200));
const multiText = await mp.$eval(".terminal-output", (el) => el.innerText);
check(
  "multi-day return variant",
  multiText.includes('Filed you under "thinking it over." Correctly.'),
  multiText.slice(0, 400),
);
await multi.close();

const hist = await browser.createBrowserContext();
const hp = await hist.newPage();
await hp.setViewport({ width: 1440, height: 900 });
await hp.goto(url, { waitUntil: "networkidle0" });
await hp.evaluate(() => {
  localStorage.setItem(
    "anviq-guide-once",
    JSON.stringify(["met-sherlock", "greeting", "badge-pop", "badge-greeting"]),
  );
});
await hp.reload({ waitUntil: "networkidle0" });
await hp.click(".terminal-trigger");
await hp.waitForSelector(".terminal-window");
const histType = async (cmd) => {
  const input = await hp.waitForSelector(".terminal-form input");
  await input.click({ clickCount: 3 });
  await hp.keyboard.press("Backspace");
  await input.type(cmd, { delay: 15 });
  await hp.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 80));
};
await histType("cd Selected work");
await hp.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 200));
await hp.reload({ waitUntil: "networkidle0" });
await hp.click(".terminal-trigger");
await hp.waitForSelector(".terminal-window");
const histInput = await hp.waitForSelector(".terminal-form input");
await histInput.click({ clickCount: 3 });
await hp.keyboard.press("Backspace");
await histInput.type("cd S", { delay: 20 });
await new Promise((r) => setTimeout(r, 80));
const histGhost = await hp.evaluate(() => {
  const rest = document.querySelector(".terminal-ghost-rest")?.textContent ?? "";
  const typed = document.querySelector(".terminal-form input")?.value ?? "";
  return typed + rest;
});
check(
  "history suggestion next session",
  /cd selected work/i.test(histGhost),
  histGhost,
);
await hist.close();

const freshM = await browser.createBrowserContext();
const fm = await freshM.newPage();
await fm.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await fm.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await fm.goto(url, { waitUntil: "networkidle0" });
const freshBadge = await fm.$eval(".sherlock-badge", (el) => ({
  text: el.textContent.trim(),
  pop: el.className,
  aria: document.querySelector(".chat-trigger")?.getAttribute("aria-label"),
})).catch(() => null);
check("fresh mobile badge 1", freshBadge?.text === "1", JSON.stringify(freshBadge));
check(
  "fresh mobile accessible name",
  !!(freshBadge?.aria && freshBadge.aria.includes("you haven't met yet")),
  freshBadge?.aria,
);
check(
  "reduced-motion badge has no pop class",
  !!(freshBadge && !freshBadge.pop.includes("sherlock-badge-pop")),
  freshBadge?.pop,
);
await fm.reload({ waitUntil: "networkidle0" });
const persistBadge = await fm.$eval(".sherlock-badge", (el) => el.textContent.trim()).catch(() => "none");
check(
  "badge persists across reload until met",
  persistBadge !== "none" && persistBadge !== "0",
  persistBadge,
);
await freshM.close();

const pending = await browser.createBrowserContext();
const pp = await pending.newPage();
await pp.setViewport({ width: 1440, height: 900 });
await pp.goto(url, { waitUntil: "networkidle0" });
await pp.evaluate(() => {
  localStorage.setItem(
    "anviq-guide-once",
    JSON.stringify([
      "met-sherlock",
      "greeting",
      "badge-pop",
      "badge-greeting",
      "return-visit",
      "multi-day-return",
    ]),
  );
  sessionStorage.setItem("anviq-guide-session", "1");
  localStorage.setItem("anviq-guide-last-visit-ms", String(Date.now()));
});
await pp.reload({ waitUntil: "networkidle0" });
const beforePending = await pp.$(".sherlock-badge");
check("no unmet badge after met", !beforePending, beforePending ? "present" : "gone");
await pp.evaluate(() => {
  const link = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/explore/services");
  link?.click();
});
await new Promise((r) => setTimeout(r, 300));
const pendingBadge = await pp.$eval(".sherlock-badge", (el) => ({
  text: el.textContent.trim(),
  aria: document.querySelector(".terminal-trigger")?.getAttribute("aria-label"),
})).catch(() => null);
check(
  "pending-hint badge after section visit",
  pendingBadge?.text === "1" && /Three ways to hire him|pending/i.test(pendingBadge?.aria || ""),
  JSON.stringify(pendingBadge),
);
await pp.click(".terminal-trigger");
await pp.waitForSelector(".terminal-window");
await pp.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 250));
const afterPending = await pp.$(".sherlock-badge");
check("pending-hint badge clears after open", !afterPending, afterPending ? "still present" : "gone");
await pending.close();

await browser.close();

const failed = log.filter((row) => !row.ok);
console.log(`\n${log.length} checks, ${failed.length} failed.`);
if (failed.length) process.exit(1);
