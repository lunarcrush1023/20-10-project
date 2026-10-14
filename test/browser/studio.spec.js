import { test, expect } from "@playwright/test";
test("offline local event: editing, TV privacy/sync, scoring, media, restore and reload", async ({
  page,
  context,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const post = async (type, extra = {}) => {
    const s = await (await request.get("/api/state")).json();
    const r = await request.post("/api/action", {
      headers: { Origin: "http://127.0.0.1:2011" },
      data: { type, ...extra, revision: s.revision },
    });
    expect(r.ok()).toBeTruthy();
  };
  await post("reset");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Điều khiển trực tiếp" }),
  ).toBeVisible();
  const tv = await context.newPage();
  await tv.goto("/audience");
  await expect(tv.getByText("Tôn vinh những điều rực rỡ")).toBeVisible();
  await page.getByRole("button", { name: "▤ Câu hỏi" }).click();
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await page.locator("#title").fill("Câu kiểm thử: Chọn bông hoa");
  await page.locator('[data-option="0"]').fill("Hoa hồng");
  await page.locator("#hint").fill("Gợi ý bí mật");
  await page.locator("#explanation").fill("Giải thích bí mật");
  await page
    .locator("#upload")
    .setInputFiles({
      name: "hoa.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    page.getByText("hoa.png", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem trước", exact: true }).click();
  await expect(page.locator("dialog")).toContainText("Câu kiểm thử");
  await expect(tv.getByText("Câu kiểm thử: Chọn bông hoa")).toHaveCount(0);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Lưu câu hỏi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "◉ Điều khiển" }).click();
  await page.getByRole("button", { name: "Trình chiếu câu đã chọn" }).click();
  await expect(tv.getByText("Câu kiểm thử: Chọn bông hoa")).toBeVisible();
  await expect(tv.getByText("Gợi ý bí mật", { exact: false })).toHaveCount(0);
  await expect(tv.locator(".correct")).toHaveCount(0);
  await expect(tv.locator("img")).toBeVisible();
  const hidden = await (await request.get("/api/audience")).json();
  expect(hidden.question).not.toHaveProperty("correct");
  expect(hidden.question).not.toHaveProperty("explanation");
  await page.getByRole("button", { name: "✕ Sai / chuyển lượt" }).click();
  await expect(tv.locator(".score-strip .current")).toContainText("Đội 2");
  await page.getByRole("button", { name: "✓ Trả lời đúng" }).click();
  await expect(tv.locator(".score-strip .current b")).toHaveText("1");
  await page.getByRole("button", { name: "↶ Hoàn tác" }).click();
  await expect(tv.locator(".score-strip .current b")).toHaveText("0");
  await page.getByRole("button", { name: "✓ Trả lời đúng" }).click();
  await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
  await expect(tv.locator(".option.correct")).toContainText("Hoa hồng");
  await page.getByRole("button", { name: "Câu tiếp →" }).click();
  await expect(tv.locator(".score-strip .current")).toContainText("Đội 3");
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await page.getByRole("button", { name: "▶ Bắt đầu" }).click();
  await expect(page.getByRole("button", { name: "Ⅱ Tạm dừng" })).toBeVisible();
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "Ⅱ Tạm dừng" }).click();
  const clock = await tv.locator("[data-clock]").textContent();
  await page.waitForTimeout(1200);
  await expect(tv.locator("[data-clock]")).toHaveText(clock);
  const backup = await (await request.get("/api/backup")).json();
  expect(Object.keys(backup.files).length).toBeGreaterThan(0);
  await post("reset");
  const restored = await request.post("/api/restore", {
    headers: { Origin: "http://127.0.0.1:2011" },
    data: backup,
  });
  expect(restored.ok()).toBeTruthy();
  await tv.reload();
  await expect(tv.locator(".score-strip").nth(0)).toContainText("1");
  const invalid = await request.post("/api/restore", {
    headers: { Origin: "http://127.0.0.1:2011" },
    data: { format: "invalid" },
  });
  expect(invalid.status()).toBe(400);
  const foreign = await request.post("/api/action", {
    headers: { Origin: "https://example.com" },
    data: { type: "reset" },
  });
  expect(foreign.status()).toBe(403);
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Điều khiển trực tiếp" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "work/admin.png", fullPage: true });
  await tv.screenshot({ path: "work/tv.png" });
});

test("open questions, configurable settings, special winner and local AV playback", async ({
  page,
  context,
  request,
}) => {
  const base = "http://127.0.0.1:2011";
  async function act(type, extra = {}) {
    const s = await (await request.get("/api/state")).json();
    expect(
      (
        await request.post("/api/action", {
          headers: { Origin: base },
          data: { type, ...extra, revision: s.revision },
        })
      ).ok(),
    ).toBeTruthy();
  }
  await act("reset");
  await page.goto("/");
  await page.getByRole("button", { name: "▤ Câu hỏi" }).click();
  await page.getByRole("button", { name: "+ Thêm câu hỏi" }).click();
  await page.locator("#title").fill("Câu tự luận thử nghiệm");
  await page.locator("#type").selectOption("open");
  await page.locator("#category").selectOption("special");
  await page.locator("#answer").fill("Đáp án chỉ dành cho MC");
  await page
    .locator("#upload")
    .setInputFiles(["test/fixtures/sample.webm", "test/fixtures/sample.wav"]);
  await expect(
    page.getByText("sample.wav", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu câu hỏi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "⚙ Thiết lập" }).click();
  await page.locator("#seconds").fill("15");
  await page.locator("#prize").fill("Giải rực rỡ");
  await page.getByRole("button", { name: "Lưu thiết lập" }).click();
  await expect(page.locator("#prize")).toHaveValue("Giải rực rỡ");
  await page.getByRole("button", { name: "◉ Điều khiển" }).click();
  const s = await (await request.get("/api/state")).json();
  const q = s.questions.find((q) => q.title === "Câu tự luận thử nghiệm");
  await page.locator("#select-q").selectOption(q.id);
  await page.getByRole("button", { name: "Trình chiếu câu đã chọn" }).click();
  const tv = await context.newPage();
  await tv.goto("/audience");
  await expect(tv.locator(".special")).toBeVisible();
  await expect(
    tv.getByText("Đáp án chỉ dành cho MC", { exact: false }),
  ).toHaveCount(0);
  await tv.getByRole("button", { name: "Bật âm thanh" }).click();
  await page
    .getByRole("button", { name: "Phát âm thanh / video", exact: true })
    .click();
  await expect
    .poll(() => tv.locator("video").evaluate((el) => el.currentTime))
    .toBeGreaterThan(0.2);
  await expect
    .poll(() => tv.locator("audio").evaluate((el) => el.currentTime))
    .toBeGreaterThan(0.2);
  const before = await tv.locator("video").evaluate((el) => el.currentTime);
  await page.getByRole("button", { name: "✧ Hiện gợi ý" }).click();
  await expect
    .poll(() => tv.locator("video").evaluate((el) => el.currentTime))
    .toBeGreaterThan(before);
  await page.getByRole("button", { name: "Dừng âm thanh / video" }).click();
  await expect
    .poll(() => tv.locator("video").evaluate((el) => el.paused))
    .toBe(true);
  const range = await request.get("/media/" + q.media[0].file, {
    headers: { Range: "bytes=0-99" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(100);
  await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
  await expect(tv.getByText("Đáp án: Đáp án chỉ dành cho MC")).toBeVisible();
  await page.getByRole("button", { name: "✓ Trả lời đúng" }).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
  await page.locator("#winner").fill("Nguyễn An");
  await page.getByRole("button", { name: "✦ Công bố người thắng" }).click();
  await expect(tv.getByRole("heading", { name: "Nguyễn An" })).toBeVisible();
  await tv.setViewportSize({ width: 1920, height: 1080 });
  await tv.screenshot({ path: "work/winner.png" });
});
