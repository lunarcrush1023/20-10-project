import { test, expect } from "@playwright/test";
import { initial } from "../../game.mjs";
const origin = "http://127.0.0.1:2011";
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
const option = (page, i) =>
  page.locator(`[data-action=chooseOption][data-index="${i}"]`);
const team = (page, i) => page.locator(`[data-action=team][data-index="${i}"]`);
async function snapshot(request) {
  return (await request.get("/api/state")).json();
}
async function act(request, type, extra = {}) {
  const s = await snapshot(request);
  const r = await request.post("/api/action", {
    headers: { Origin: origin },
    data: { type, ...extra, revision: s.revision },
  });
  expect(r.ok()).toBeTruthy();
}
async function tvPage(context) {
  const tv = await context.newPage();
  await tv.goto("/audience");
  return tv;
}
test.beforeEach(async ({ request, page }) => {
  expect(
    (
      await request.post("/api/restore", {
        headers: { Origin: origin },
        data: { format: "studio-2010-v3", state: initial(), files: {} },
      })
    ).ok(),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1366, height: 768 });
});

test("waiting state, one-click normal grading, rotation and exact shared TV preview", async ({
  page,
  context,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const tv = await tvPage(context),
    preview = page.frameLocator('iframe[title="Đang trên TV"]');
  await expect(page.getByRole("button", { name: /03 ·/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "MỞ VÒNG XUNG PHONG", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "BỎ CÂU", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "ĐÚNG (+1)", exact: true }),
  ).toHaveCount(0);
  await expect(option(page, 0)).toContainText("✓ Đáp án đúng");
  await expect(preview.getByText("Tôn vinh những điều rực rỡ")).toBeVisible();
  const s = await snapshot(request);
  await page.locator("#select-q").selectOption(s.questions[1].id);
  await expect(tv.getByRole("heading", { name: "Chuẩn bị..." })).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: "Chuẩn bị..." }),
  ).toBeVisible();
  await expect(page.locator(".live-question")).toHaveText(s.questions[1].title);
  let publicState = await (await request.get("/api/audience")).json();
  expect(publicState.question).not.toHaveProperty("title");
  expect(publicState.question).not.toHaveProperty("options");
  expect(publicState.question).not.toHaveProperty("media");
  await click(page, "CÂU TRƯỚC");
  await expect(page.locator(".live-question")).toHaveText(s.questions[0].title);
  await click(page, "HIỆN CÂU HỎI");
  await expect(tv.locator(".question-title")).toHaveText(s.questions[0].title);
  await expect(preview.locator(".question-title")).toHaveText(
    s.questions[0].title,
  );
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await option(page, 0).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["1", "0", "0", "0"]);
  await expect(tv.locator(".option.correct")).toHaveCount(1);
  await expect(option(page, 0)).toBeDisabled();
  await expect(preview.locator(".score-strip b")).toHaveText([
    "1",
    "0",
    "0",
    "0",
  ]);
  await click(page, "CÂU TIẾP THEO");
  await expect(tv.getByRole("heading", { name: "Chuẩn bị..." })).toBeVisible();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 2");
  await click(page, "HIỆN CÂU HỎI");
  await option(page, 1).click();
  await expect(tv.locator(".feedback")).toHaveText("Sai rồi!");
  await expect(tv.locator(".option.correct")).toHaveCount(1);
  await expect(tv.locator(".score-strip b")).toHaveText(["1", "0", "0", "0"]);
  await expect(option(page, 0)).toBeDisabled();
  await click(page, "CÂU TIẾP THEO");
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 3");
  await click(page, "HIỆN CÂU HỎI");
  const box = await page.locator(".tv-preview-mount").boundingBox();
  expect(box.width).toBeGreaterThan(400);
  expect(box.x).toBeGreaterThan(400);
  expect(box.y + box.height).toBeLessThan(768);
  const judge = await page
    .getByRole("button", { name: "CHỊU THUA / CHUYỂN TỔ" })
    .boundingBox();
  expect(judge.y + judge.height).toBeLessThan(768);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "work/centered-admin.png", fullPage: true });
});

test("four giveups activate free-for-all, wrong stays hidden, manual reveal or correct ends", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  const tv = await tvPage(context);
  await click(page, "HIỆN CÂU HỎI");
  for (let i = 0; i < 4; i++) await click(page, "CHỊU THUA / CHUYỂN TỔ");
  await expect(page.locator(".live-status")).toContainText(
    "⚡ Tự do giành quyền trả lời!",
  );
  await expect(tv.locator(".eyebrow")).toContainText(
    "⚡ Tự do giành quyền trả lời!",
  );
  await expect(tv.locator(".score-strip .current")).toHaveCount(0);
  await expect(option(page, 0)).toBeDisabled();
  await team(page, 1).click();
  await option(page, 1).click();
  await expect(tv.locator(".feedback")).toHaveText("Chưa chính xác!");
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await expect(tv.locator(".score-strip .current")).toHaveCount(0);
  expect(
    (await (await request.get("/api/audience")).json()).question,
  ).not.toHaveProperty("answer");
  await team(page, 2).click();
  await option(page, 0).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "1", "0"]);
  await expect(tv.locator(".option.correct")).toHaveCount(1);
  await click(page, "CÂU TIẾP THEO");
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 4");
  await click(page, "HIỆN CÂU HỎI");
  for (let i = 0; i < 4; i++) await click(page, "CHỊU THUA / CHUYỂN TỔ");
  await click(page, "HIỆN ĐÁP ÁN");
  await expect(page.locator(".live-status")).toContainText("Câu đã kết thúc");
  await expect(tv.locator(".option.correct")).toHaveCount(1);
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "1", "0"]);
});

test("special is individual open-ended; backup offers unrestricted hidden-answer retries", async ({
  page,
  context,
  request,
}) => {
  const s = await snapshot(request);
  await page.goto("/");
  const tv = await tvPage(context);
  await page.locator("#select-q").selectOption(s.questions[12].id);
  await expect(
    page.getByRole("button", { name: "ĐÚNG / CHỐT ĐÁP ÁN" }),
  ).toBeDisabled();
  await expect(page.locator("#winner")).toHaveCount(0);
  await click(page, "HIỆN CÂU HỎI");
  await click(page, "SAI (0 ĐIỂM)");
  await expect(tv.locator(".feedback")).toHaveText("Chưa chính xác!");
  expect(
    (await (await request.get("/api/audience")).json()).question,
  ).not.toHaveProperty("answer");
  await expect(
    page.getByRole("button", { name: "ĐÚNG / CHỐT ĐÁP ÁN" }),
  ).toBeEnabled();
  await click(page, "ĐÚNG / CHỐT ĐÁP ÁN");
  await expect(tv.locator(".feedback")).toContainText("Chính xác!");
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
  expect(
    (await (await request.get("/api/audience")).json()).question,
  ).toHaveProperty("answer");
  await page.locator("#select-q").selectOption(s.questions[13].id);
  await click(page, "HIỆN CÂU HỎI");
  await expect(tv.locator(".score-strip .current")).toHaveCount(0);
  await team(page, 3).click();
  await option(page, 1).click();
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await team(page, 0).click();
  await option(page, 0).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["1", "0", "0", "0"]);
  await expect(tv.locator(".option.correct")).toHaveCount(1);
});

test("score adjustment inline, undo and championship announcement without score tab", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const tv = await tvPage(context);
  await click(page, "Cộng điểm Tổ 3");
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "1", "0"]);
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 1");
  await click(page, "Trừ điểm Tổ 3");
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
  await click(page, "HOÀN TÁC");
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "1", "0"]);
  page.on("dialog", (d) => d.accept());
  await click(page, "🏆 CÔNG BỐ VÔ ĐỊCH");
  await expect(
    tv.getByRole("heading", { name: "Tổ 3", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Tổ 3", exact: true }),
  ).toBeVisible();
});

test("editor toggles answer inputs and keeps hint media offline through backup/restore", async ({
  page,
  context,
  request,
}) => {
  await context.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("/");
  await click(page, "01 · Quản lý câu hỏi");
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await expect(page.locator("#answer")).toBeHidden();
  await expect(page.locator("#choices")).toBeVisible();
  await page.locator("#type").selectOption("open");
  await expect(page.locator("#choices")).toBeHidden();
  await expect(page.locator("#answer")).toBeVisible();
  await page.locator("#answer").fill("Đáp án tự luận cần giữ");
  await page.locator("#type").selectOption("choice");
  await expect(page.locator("#answer")).toBeHidden();
  await page.locator("#hint").fill("Gợi ý âm thanh và video");
  await page
    .locator("#hintUpload")
    .setInputFiles(["test/fixtures/sample.webm", "test/fixtures/sample.wav"]);
  await expect(page.locator("#hint-fields")).toContainText("sample.wav");
  await page.locator("#hintEnabled").uncheck();
  await click(page, "Lưu câu hỏi");
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  let s = await snapshot(request);
  expect(s.questions[0].answer).toBe("Đáp án tự luận cần giữ");
  expect(s.questions[0].hintMedia.length).toBe(2);
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await page.locator("#hintEnabled").check();
  await expect(page.locator("#hint")).toHaveValue("Gợi ý âm thanh và video");
  await click(page, "Lưu câu hỏi");
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  await click(page, "02 · Điều khiển trực tiếp");
  const tv = await tvPage(context);
  await click(page, "HIỆN CÂU HỎI");
  expect(
    (await (await request.get("/api/audience")).json()).question,
  ).not.toHaveProperty("hintMedia");
  await click(tv, "Bật âm thanh");
  await click(page, "HIỆN GỢI Ý");
  await expect(tv.locator("video")).toBeVisible();
  await click(page, "Phát tệp gợi ý");
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.currentTime))
    .toBeGreaterThan(0.3);
  await expect
    .poll(() => tv.locator("audio").evaluate((e) => e.currentTime))
    .toBeGreaterThan(0.3);
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .locator("video")
        .evaluate((e) => e.muted),
    )
    .toBe(true);
  await click(page, "Dừng tệp gợi ý");
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.paused))
    .toBe(true);
  const backup = await (await request.get("/api/backup")).json();
  expect(Object.keys(backup.files)).toHaveLength(2);
  expect(
    (
      await request.post("/api/restore", {
        headers: { Origin: origin },
        data: backup,
      })
    ).ok(),
  ).toBeTruthy();
  await page.reload();
  await tv.reload();
  await expect(tv.locator("video")).toBeVisible();
  await click(page, "ẨN GỢI Ý");
  await expect(tv.locator("video")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Điều khiển trực tiếp" }),
  ).toBeVisible();
});

test("fullscreen repeatedly toggles with Escape and keeps sync; timer can pause, resume and disable", async ({
  page,
  context,
  request,
}) => {
  await act(request, "settings", {
    settings: { ...initial().settings, seconds: 5, warningSound: true },
  });
  await page.goto("/");
  await click(page, "HIỆN CÂU HỎI");
  const tv = await tvPage(context);
  await tv.addInitScript(() => {
    window.warningCount = 0;
    const f = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...a) {
      window.warningCount++;
      return f.apply(this, a);
    };
  });
  await tv.reload();
  const before = await tv.locator(".stage").boundingBox();
  for (let i = 0; i < 3; i++) {
    await click(tv, "Toàn màn hình");
    await expect
      .poll(() => tv.evaluate(() => !!document.fullscreenElement))
      .toBe(true);
    if (i === 1) await tv.keyboard.press("Escape");
    else await click(tv, "Thoát toàn màn hình");
    await expect
      .poll(() => tv.evaluate(() => !!document.fullscreenElement))
      .toBe(false);
  }
  const after = await tv.locator(".stage").boundingBox();
  expect(after.width).toBeCloseTo(before.width, 0);
  await click(tv, "Toàn màn hình");
  await team(page, 2).click();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 3");
  expect(await tv.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await click(tv, "Thoát toàn màn hình");
  await click(tv, "Bật âm thanh");
  await click(page, "Bắt đầu");
  await click(page, "Tạm dừng");
  await click(page, "Tiếp tục");
  await expect(tv.locator("[data-clock]")).toHaveText("00s", { timeout: 8000 });
  await expect.poll(() => tv.evaluate(() => window.warningCount)).toBe(1);
  expect((await snapshot(request)).live.settled).toBe(false);
  await page.locator("#liveTimerEnabled").uncheck();
  await expect(tv.locator("[data-clock]")).toBeHidden();
  await expect(
    page.frameLocator("iframe").locator("[data-clock]"),
  ).toBeHidden();
});

test("question media upload, private preview, playback/ranges, undo and request guards remain intact", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  await click(page, "01 · Quản lý câu hỏi");
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await page.locator("#title").fill("Câu có tệp từ máy tính");
  await page
    .locator("#upload")
    .setInputFiles(["test/fixtures/sample.webm", "test/fixtures/sample.wav"]);
  await expect(page.getByText("sample.wav", { exact: false })).toBeVisible();
  const tv = await tvPage(context);
  await click(page, "Xem trước");
  await expect(page.locator("dialog")).toContainText("Câu có tệp từ máy tính");
  await expect(tv.getByText("Câu có tệp từ máy tính")).toHaveCount(0);
  await click(page, "Đóng");
  await click(page, "Lưu câu hỏi");
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  await click(page, "02 · Điều khiển trực tiếp");
  await click(page, "HIỆN CÂU HỎI");
  await expect(tv.locator("video")).toBeVisible();
  await click(tv, "Bật âm thanh");
  await click(page, "Phát tệp câu hỏi");
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.currentTime))
    .toBeGreaterThan(0.3);
  const time = await tv.locator("video").evaluate((e) => e.currentTime);
  await click(page, "Cộng điểm Tổ 4");
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.currentTime))
    .toBeGreaterThan(time + 0.3);
  await click(page, "Dừng tệp câu hỏi");
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.paused))
    .toBe(true);
  const s = await snapshot(request),
    media = s.questions[0].media[0].file;
  const range = await request.get("/media/" + media, {
    headers: { Range: "bytes=0-99" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(100);
  await option(page, 0).click();
  await expect(tv.locator(".option.correct")).toHaveCount(1);
  await click(page, "HOÀN TÁC");
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "1"]);
  await expect(option(page, 0)).toBeEnabled();
  expect(
    (
      await request.post("/api/restore", {
        headers: { Origin: origin },
        data: { format: "bad" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/action", {
        headers: { Origin: "https://example.com" },
        data: { type: "reset" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/action", {
        headers: { Origin: origin },
        data: { type: "reset", revision: -1 },
      })
    ).status(),
  ).toBe(409);
});
