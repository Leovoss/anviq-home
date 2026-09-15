// Live checks for the mobile assistant's Siri/Spotlight-shaped redesign:
// one persistent search bar, nothing above it until a question is asked,
// answer floats above the bar and gets replaced by the next question.
// Same puppeteer-core-against-cached-Chromium pattern as the other
// scripts/verify-*.mjs scripts. Not part of CI.

import puppeteer from "puppeteer-core";
import path from "node:path";

const chrome =
  process.env.CHROME ||
  path.join(
    process.env.LOCALAPPDATA,
    "ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  );
const url = process.argv[2] || "http://localhost:5173/";

let pass = 0;
let fail = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "OK" : "FAIL"} ${label}${detail ? " - " + detail : ""}`);
  if (ok) pass++;
  else fail++;
};

const browser = await puppeteer.launch({ executablePath: chrome, headless: "new" });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "networkidle0" });

  const bar = await page.waitForSelector(".chat-bar", { timeout: 5000 });
  const rest = await bar.evaluate((el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      borderRadius: cs.borderRadius,
      left: rect.left,
      right: window.innerWidth - rect.right,
      height: rect.height,
    };
  });
  check("bar ≥44px tall", rest.height >= 44, `${rest.height}px`);
  check("bar side margins ~18px (tab bar rhythm)", Math.abs(rest.left - 18) <= 2 && Math.abs(rest.right - 18) <= 2, `left=${rest.left} right=${rest.right}`);

  const answerAtRest = await page.evaluate(() => !!document.querySelector(".chat-answer"));
  check("no answer panel before any interaction", !answerAtRest);

  const oldChrome = await page.evaluate(() => ({
    trigger: !!document.querySelector(".chat-trigger"),
    sheet: !!document.querySelector(".chat-sheet"),
    titlebar: !!document.querySelector(".chat-titlebar"),
    starterChips: !!document.querySelector(".chat-starter-chips"),
  }));
  check("old trigger pill gone", !oldChrome.trigger);
  check("old modal sheet gone", !oldChrome.sheet);
  check("old titlebar gone", !oldChrome.titlebar);
  check("old starter-chip section gone", !oldChrome.starterChips);

  await page.click(".chat-bar input");
  await new Promise((r) => setTimeout(r, 300));
  const tintAfterFocus = await page.evaluate(() => !!document.querySelector(".chat-edge-tint"));
  check("edge tint appears once engaged", tintAfterFocus);
  const answerAfterFocus = await page.evaluate(() => !!document.querySelector(".chat-answer"));
  check("still no answer panel from focus alone (pure bar)", !answerAfterFocus);

  await page.type(".chat-bar input", "selected work");
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 500));

  const answer = await page.evaluate(() => {
    const el = document.querySelector(".chat-answer");
    if (!el) return null;
    return {
      text: el.textContent,
      hasQuery: !!el.querySelector(".chat-answer-query"),
      hasOpenButton: !!el.querySelector(".chat-open-button"),
      hasChips: !!el.querySelector(".chat-chip-row"),
      inputCleared: document.querySelector(".chat-bar input")?.value === "",
    };
  });
  check("answer panel appears after asking", !!answer, JSON.stringify(answer));
  if (answer) {
    check("answer shows the query tag", answer.hasQuery);
    check("answer offers an Open button", answer.hasOpenButton);
    check("answer offers follow-up chips (project list)", answer.hasChips);
    check("bar input cleared after ask", answer.inputCleared);
  }

  await page.click(".chat-chip");
  await new Promise((r) => setTimeout(r, 400));
  const secondAnswer = await page.evaluate(() => document.querySelector(".chat-answer")?.textContent);
  check("tapping a follow-up chip replaces the answer", secondAnswer && secondAnswer !== answer?.text, secondAnswer);
  const onlyOneAnswer = await page.evaluate(() => document.querySelectorAll(".chat-answer").length);
  check("exactly one answer panel at a time", onlyOneAnswer === 1, `count=${onlyOneAnswer}`);

  await page.click('.chat-answer-dismiss');
  await new Promise((r) => setTimeout(r, 400));
  const afterDismiss = await page.evaluate(() => ({
    answer: !!document.querySelector(".chat-answer"),
    tint: !!document.querySelector(".chat-edge-tint"),
    bar: !!document.querySelector(".chat-bar"),
  }));
  check("answer panel gone after dismiss", !afterDismiss.answer);
  check("edge tint gone after dismiss", !afterDismiss.tint);
  check("bar still present after dismiss (persistent)", afterDismiss.bar);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
} finally {
  await browser.close();
}
