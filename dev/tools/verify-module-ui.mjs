import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const base = process.env.QA_ORIGIN || "http://127.0.0.1:8156";
const out = process.env.VERIFY_OUTPUT || "/tmp/jma-module-ui";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  }),
  page = await context.newPage(),
  errors = [],
  checks = [];
page.on("pageerror", (error) => errors.push(error.message));
const status = () => page.evaluate(() => window.__MODULE_GALLERY__.status);
async function select(id) {
  await page.locator('#filters [data-choice="all"]').click();
  await page.locator("#module-search").fill(id);
  await page.locator(`[data-module="${id}"]`).click();
  await page.waitForFunction(
    (id) => window.__MODULE_GALLERY__?.status.selected === id,
    id,
  );
}
try {
  await page.goto(`${base}/dev/modules/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => window.__MODULE_GALLERY__?.status.selected === "logic:intent",
  );
  assert.equal(await page.locator("body").innerText().then((text) => text.includes("null")), false);
  assert.equal(await page.locator("#module-list .module-row").count(), (await status()).count);
  const searchBox = await page.locator("#module-search").boundingBox();
  const sidebarToggle = page.locator("#sidebar-toggle");
  const toggleBox = await sidebarToggle.boundingBox();
  assert.ok(searchBox && toggleBox);
  assert.ok(Math.abs((searchBox.y + searchBox.height / 2) - (toggleBox.y + toggleBox.height / 2)) < 2);
  await sidebarToggle.click();
  assert.equal(await sidebarToggle.isVisible(), true);
  assert.equal(await sidebarToggle.getAttribute("aria-expanded"), "false");
  await sidebarToggle.click();
  assert.equal(await sidebarToggle.getAttribute("aria-expanded"), "true");
  await page.locator('#filters button').filter({ hasText: '道具' }).click();
  await page.waitForFunction(() => document.querySelector('.module-thumbnail[src^="data:image/"]'));
  checks.push("Sidebar stays aligned and reversible, all modules render at once, and 3D thumbnails load");
  await select('prop:windmill');
  await page.getByRole("button", { name: "暂停动作", exact: true }).click();
  assert.equal(
    (await status()).runtime.worlds.meadow.entities.preview.state,
    "idle",
  );
  await page.getByRole("button", { name: "继续工作", exact: true }).click();
  await page.getByRole("button", { name: "换成蓝色", exact: true }).click();
  assert.equal(
    (await status()).runtime.worlds.meadow.entities.preview.color,
    "#95becb",
  );
  await page.locator("#preview-stage").screenshot({ path: `${out}/prop.png` });
  checks.push("Real prefab state, animation and color commands");
  await select("logic:world-runtime");
  let s = await status();
  assert.equal(s.stage.scriptedEntities.length, 2);
  await page.getByRole("button", { name: "增加花园", exact: true }).click();
  assert.equal((await status()).stage.scriptedEntities.length, 3);
  await page.getByRole("button", { name: "夜晚", exact: true }).click();
  assert.equal((await status()).runtime.worlds.meadow.environment, "night");
  await page
    .getByRole("button", { name: "保存并恢复试验", exact: true })
    .click();
  assert.equal((await status()).stage.scriptedEntities.length, 3);
  assert.equal((await status()).runtime.worlds.meadow.environment, "night");
  await page.getByRole("button", { name: "收起花园", exact: true }).click();
  assert.equal((await status()).stage.scriptedEntities.length, 2);
  await page.locator("#command-panel").waitFor({state:"visible"});
  await page.locator("#refresh-proposal").click();
  const valid = JSON.parse(await page.locator("#command-input").inputValue());
  await page.locator("#command-input").fill(
    JSON.stringify({
      ...valid,
      commands: [
        {
          type: "entity.spawn",
          id: "should-not-exist",
          asset: "prop:garden",
          position: [0, 0],
        },
        { type: "entity.animate", id: "missing", animation: "activate" },
      ],
    }),
  );
  await page.locator("#apply-proposal").click();
  assert.match(await page.locator("#preview-status").textContent(), /没有应用/);
  assert.equal((await status()).stage.scriptedEntities.length, 2);
  await page.locator("#command-input").fill(JSON.stringify(valid));
  await page.locator("#apply-proposal").click();
  assert.equal((await status()).stage.scriptedEntities.length, 3);
  await page.locator("#apply-proposal").click();
  assert.match(await page.locator("#preview-status").textContent(), /Stale/);
  await page
    .locator("#preview-stage")
    .screenshot({ path: `${out}/events.png` });
  checks.push(
    "Scripted spawn/remove, night/day, save/restore, invalid-batch isolation and stale AI proposal rejection",
  );
  await select("ui:choices");
  await page.getByRole("button", { name: "试一小步", exact: true }).click();
  assert.match(await page.locator("#preview-status").textContent(), /试一小步/);
  await select("ui:encounter");
  await page.getByRole("button", { name: "打开角色对话", exact: true }).click();
  await page.locator(".encounter-choices button").first().click();
  assert.match(await page.locator("#preview-status").textContent(), /互动回调/);
  await page.getByRole("button", { name: "继续逛逛", exact: true }).click();
  assert.equal(await page.locator(".encounter-dialog").isHidden(), true);
  await select("ui:voice");
  await page.getByRole("button", { name: "receiving", exact: true }).click();
  assert.equal(
    await page.locator(".demo-mic").getAttribute("data-state"),
    "receiving",
  );
  await select("logic:answer-support");
  await page.getByRole("button", { name: "开始等候", exact: true }).click();
  await page
    .getByRole("button", { name: "一座小桥", exact: true })
    .waitFor({ state: "visible", timeout: 6000 });
  checks.push(
    "Shared choices, encounter view, voice-state component and actual 4-second fallback",
  );
  for (const id of [
    "clay:dog",
    "npc:lingdang",
    "yellow:bull",
    "wow:window",
    "world:moon",
  ]) {
    await select(id);
    assert.ok((await status()).stage.triangles > 0);
  }
  checks.push("Five model/world families render through shared factories");
  await select("audio:music/calm.mp3");
  await page.locator("#audio-preview").evaluate(async (a) => {
    await a.play();
  });
  await page.waitForFunction(
    () => document.querySelector("#audio-preview").currentTime > 0,
  );
  await select("prop:windmill");
  assert.equal(
    await page.locator("#audio-preview").evaluate((a) => a.paused),
    true,
  );
  assert.equal(await page.locator(".encounter-dialog").count(), 0);
  checks.push(
    "Real audio decodes; changing modules stops sound and disposes dialogs",
  );
  const catalog = await context.request.get(`${base}/dev/modules/catalog.json`);
  assert.equal(catalog.status(), 200);
  assert.equal((await catalog.json()).modules.length, (await status()).count);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#module-search").fill("");
  await page.screenshot({ path: `${out}/mobile.png`, fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  checks.push(
    "Machine-readable catalog matches UI; mobile has no horizontal overflow",
  );
  assert.deepEqual(errors, []);
  const report = { passed: true, base, checks, errors };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
