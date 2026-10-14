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
  await page.getByRole("button", { name: "01 · Quản lý câu hỏi" }).click();
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await page.locator("#title").fill("Câu kiểm thử: Chọn bông hoa");
  await page.locator('[data-option="0"]').fill("Hoa hồng");
  await page.locator("#hint").fill("Gợi ý bí mật");
  await page.locator("#explanation").fill("Giải thích bí mật");
  await page.locator("#upload").setInputFiles({
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
  await page.getByRole("button", { name: "02 · Điều khiển trực tiếp" }).click();
  await page.getByRole("button", { name: "HIỆN CÂU HỎI" }).click();
  await expect(tv.getByText("Câu kiểm thử: Chọn bông hoa")).toBeVisible();
  await expect(tv.getByText("Gợi ý bí mật", { exact: false })).toHaveCount(0);
  await expect(tv.locator(".correct")).toHaveCount(0);
  await expect(tv.locator("img")).toBeVisible();
  const hidden = await (await request.get("/api/audience")).json();
  expect(hidden.question).not.toHaveProperty("correct");
  expect(hidden.question).not.toHaveProperty("explanation");
  await page.getByRole("button", { name: "CHỊU THUA / CHUYỂN TỔ" }).click();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 2");
  await page.getByRole("button", { name: "ĐÚNG (+1)" }).click();
  await expect(tv.locator(".score-strip .current b")).toHaveText("1");
  await page.getByRole("button", { name: "HOÀN TÁC" }).click();
  await expect(tv.locator(".score-strip .current b")).toHaveText("0");
  await page.getByRole("button", { name: "ĐÚNG (+1)" }).click();
  await page.getByRole("button", { name: "HIỆN ĐÁP ÁN", exact: true }).click();
  await expect(tv.locator(".option.correct")).toContainText("Hoa hồng");
  await page.getByRole("button", { name: "CÂU TIẾP THEO" }).click();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 2");
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "Tạm dừng" }).click();
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
  await page.getByRole("button", { name: "01 · Quản lý câu hỏi" }).click();
  await page.getByRole("button", { name: "+ Thêm câu hỏi" }).click();
  await page.locator("#title").fill("Câu tự luận thử nghiệm");
  await page.locator("#type").selectOption("open");
  await page.locator("#category").selectOption("special");
  await page.locator("#answer").fill("Đáp án chỉ dành cho MC");
  await page.locator("#hintEnabled").check();
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
  await page.getByRole("button", { name: "02 · Điều khiển trực tiếp" }).click();
  const s = await (await request.get("/api/state")).json();
  const q = s.questions.find((q) => q.title === "Câu tự luận thử nghiệm");
  await page.locator("#select-q").selectOption(q.id);
  await page.getByRole("button", { name: "HIỆN CÂU HỎI" }).click();
  const tv = await context.newPage();
  await tv.goto("/audience");
  await expect(tv.locator(".special")).toBeVisible();
  await expect(
    tv.getByText("Đáp án chỉ dành cho MC", { exact: false }),
  ).toHaveCount(0);
  await tv.getByRole("button", { name: "Bật âm thanh" }).click();
  await page
    .getByRole("button", { name: "Phát tệp câu hỏi", exact: true })
    .click();
  await expect
    .poll(() => tv.locator("video").evaluate((el) => el.currentTime))
    .toBeGreaterThan(0.2);
  await expect
    .poll(() => tv.locator("audio").evaluate((el) => el.currentTime))
    .toBeGreaterThan(0.2);
  const before = await tv.locator("video").evaluate((el) => el.currentTime);
  await page.getByRole("button", { name: "HIỆN GỢI Ý" }).click();
  await expect
    .poll(() => tv.locator("video").evaluate((el) => el.currentTime))
    .toBeGreaterThan(before + 0.4);
  await page.getByRole("button", { name: "Dừng tệp câu hỏi" }).click();
  await expect
    .poll(() => tv.locator("video").evaluate((el) => el.paused))
    .toBe(true);
  const range = await request.get("/media/" + q.media[0].file, {
    headers: { Range: "bytes=0-99" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(100);
  await page.getByRole("button", { name: "HIỆN ĐÁP ÁN", exact: true }).click();
  await expect(tv.getByText("Đáp án: Đáp án chỉ dành cho MC")).toBeVisible();
  await page.getByRole("button", { name: "ĐÚNG (KHÔNG CỘNG ĐIỂM)" }).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
  await page.locator("#winner").fill("Nguyễn An");
  await page.getByRole("button", { name: "CÔNG BỐ NGƯỜI THẮNG" }).click();
  await expect(tv.getByRole("heading", { name: "Nguyễn An" })).toBeVisible();
  await tv.setViewportSize({ width: 1920, height: 1080 });
  await tv.screenshot({ path: "work/winner.png" });
});

test("v2 live controls: private option selection, wrong/giveup, manual team and double scoring guard", async ({
  page,
  context,
  request,
}) => {
  const s = await (await request.get("/api/state")).json();
  await request.post("/api/action", {
    headers: { Origin: "http://127.0.0.1:2011" },
    data: { type: "reset", revision: s.revision },
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "HIỆN CÂU HỎI", exact: true }).click();
  const tv = await context.newPage();
  await tv.goto("/audience");
  await page.locator('[data-action=chooseOption][data-index="1"]').click();
  await expect(page.locator(".answer-button.selected")).toContainText("B");
  await expect(page.locator(".private-verdict")).toContainText("không khớp");
  const projection = await (await request.get("/api/audience")).json();
  expect(projection.live).not.toHaveProperty("selectedOption");
  expect(projection.question).not.toHaveProperty("correct");
  const title = await tv.locator(".question-title").textContent();
  await page.getByRole("button", { name: "SAI (0 ĐIỂM)", exact: true }).click();
  await expect(tv.locator(".feedback")).toContainText("Chưa chính xác");
  await expect(tv.locator(".question-title")).toHaveText(title);
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 1");
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
  await page.locator('[data-action=team][data-index="3"]').click();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 4");
  await page.getByRole("button", { name: "CHỊU THUA / CHUYỂN TỔ" }).click();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 1");
  await page.locator('[data-action=chooseOption][data-index="1"]').click();
  await page.getByRole("button", { name: "ĐÚNG (+1)", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ĐÚNG (+1)", exact: true }),
  ).toBeDisabled();
  await expect(tv.locator(".question-title")).toHaveText(title);
  await expect(tv.locator(".score-strip b")).toHaveText(["1", "0", "0", "0"]);
  await expect(tv.locator(".option.correct")).toHaveCount(0);
  await page.getByRole("button", { name: "HOÀN TÁC", exact: true }).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
  const box = await page
    .getByRole("button", { name: "SAI (0 ĐIỂM)" })
    .boundingBox();
  expect(box.y + box.height).toBeLessThan(768);
  await page.screenshot({ path: "work/admin-v2.png", fullPage: true });
  await page.getByRole("button", { name: "03 · Điểm số & kết quả" }).click();
  await expect(page.locator(".score-history")).toContainText("Hoàn tác");
  await page.locator("#teamscore2").fill("5");
  await page
    .getByRole("button", { name: "Lưu tên & điểm", exact: true })
    .click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "5", "0"]);
  await expect(page.locator(".score-history")).toContainText(
    "Điều chỉnh thủ công",
  );
  await page.getByRole("button", { name: "HOÀN TÁC", exact: true }).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "0", "0"]);
});

test("hint media stays private until reveal, survives disabling, plays offline and restores from backup", async ({
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
  await page.getByRole("button", { name: "01 · Quản lý câu hỏi" }).click();
  await page.getByRole("button", { name: "+ Thêm câu hỏi" }).click();
  await page.locator("#title").fill("Câu có gợi ý đa phương tiện");
  for (let i = 0; i < 4; i++)
    await page.locator(`[data-option="${i}"]`).fill("Lựa chọn " + i);
  await page.locator("#hintEnabled").check();
  await page.locator("#hint").fill("Nội dung gợi ý riêng");
  await page
    .locator("#hintUpload")
    .setInputFiles(["test/fixtures/sample.webm", "test/fixtures/sample.wav"]);
  await expect(page.locator("#hint-fields")).toContainText("sample.wav");
  await page.locator("#hintEnabled").uncheck();
  await expect(page.locator("#hint-fields")).toBeHidden();
  await page.getByRole("button", { name: "Lưu câu hỏi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  let s = await (await request.get("/api/state")).json();
  let q = s.questions.find((q) => q.title === "Câu có gợi ý đa phương tiện");
  expect(q.hint).toBe("Nội dung gợi ý riêng");
  expect(q.hintMedia.length).toBe(2);
  await page.getByRole("button", { name: "02 · Điều khiển trực tiếp" }).click();
  await page.locator("#select-q").selectOption(q.id);
  await page.getByRole("button", { name: "HIỆN CÂU HỎI", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "HIỆN GỢI Ý", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "01 · Quản lý câu hỏi" }).click();
  await page.locator(`[data-action=edit][data-id="${q.id}"]`).click();
  await page.locator("#hintEnabled").check();
  await expect(page.locator("#hint")).toHaveValue("Nội dung gợi ý riêng");
  await page.getByRole("button", { name: "Lưu câu hỏi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "+ Thêm câu hỏi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "02 · Điều khiển trực tiếp" }).click();
  const tv = await context.newPage();
  await tv.goto("/audience");
  await expect(tv.locator("video")).toHaveCount(0);
  expect(
    (await (await request.get("/api/audience")).json()).question,
  ).not.toHaveProperty("hintMedia");
  await tv.getByRole("button", { name: "Bật âm thanh" }).click();
  await page.getByRole("button", { name: "HIỆN GỢI Ý", exact: true }).click();
  await expect(tv.locator(".hint-block")).toContainText("Nội dung gợi ý riêng");
  await expect(tv.locator("video")).toBeVisible();
  await expect(tv.locator("video")).not.toHaveAttribute("controls");
  await page
    .getByRole("button", { name: "Phát tệp gợi ý", exact: true })
    .click();
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.currentTime))
    .toBeGreaterThan(0.3);
  await expect
    .poll(() => tv.locator("audio").evaluate((e) => e.currentTime))
    .toBeGreaterThan(0.3);
  await page
    .getByRole("button", { name: "Dừng tệp gợi ý", exact: true })
    .click();
  await expect
    .poll(() => tv.locator("video").evaluate((e) => e.paused))
    .toBe(true);
  const backup = await (await request.get("/api/backup")).json();
  expect(backup.files[q.hintMedia[0].file]).toBeTruthy();
  const restore = await request.post("/api/restore", {
    headers: { Origin: "http://127.0.0.1:2011" },
    data: backup,
  });
  expect(restore.ok()).toBeTruthy();
  await tv.reload();
  await expect(tv.locator("video")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "ẨN GỢI Ý", exact: true }).click();
  await expect(tv.locator("video")).toHaveCount(0);
  expect(
    (await (await request.get("/api/audience")).json()).question,
  ).not.toHaveProperty("hintMedia");
});

test("fullscreen is a repeatable two-way browser API toggle with Escape and sync", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/");
  const tv = await context.newPage();
  await tv.goto("/audience");
  const original = await tv.locator(".stage").boundingBox();
  for (let n = 0; n < 3; n++) {
    await tv
      .getByRole("button", { name: "Toàn màn hình", exact: true })
      .click();
    await expect
      .poll(() => tv.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    await expect(
      tv.getByRole("button", { name: "Thoát toàn màn hình", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    if (n === 1) await tv.keyboard.press("Escape");
    else
      await tv
        .getByRole("button", { name: "Thoát toàn màn hình", exact: true })
        .click();
    await expect
      .poll(() => tv.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(false);
    await expect(
      tv.getByRole("button", { name: "Toàn màn hình", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  }
  const after = await tv.locator(".stage").boundingBox();
  expect(after.width).toBeCloseTo(original.width, 0);
  expect(after.height).toBeCloseTo(original.height, 0);
  await tv.getByRole("button", { name: "Toàn màn hình", exact: true }).click();
  await page.locator('[data-action=team][data-index="2"]').click();
  await expect(tv.locator(".score-strip .current")).toContainText("Tổ 3");
  expect(await tv.evaluate(() => Boolean(document.fullscreenElement))).toBe(
    true,
  );
  await tv
    .getByRole("button", { name: "Thoát toàn màn hình", exact: true })
    .click();
  await tv.setViewportSize({ width: 1920, height: 1080 });
  await expect(tv.locator(".stage")).toBeVisible();
});

test("explicit tiebreak participants, fixed point, winner and disabled timer", async ({
  page,
  context,
  request,
}) => {
  const s = await (await request.get("/api/state")).json();
  await request.post("/api/action", {
    headers: { Origin: "http://127.0.0.1:2011" },
    data: { type: "reset", revision: s.revision },
  });
  await page.goto("/");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "03 · Điểm số & kết quả" }).click();
  await page.locator('input[name=tieTeam][value="1"]').uncheck();
  await page.locator('input[name=tieTeam][value="3"]').uncheck();
  await page.getByRole("button", { name: "MỞ CÂU PHÂN ĐỊNH HÒA" }).click();
  await expect(page.locator(".live-status")).toContainText("Phân định hòa");
  await expect(
    page.locator('[data-action=team][data-index="1"]'),
  ).toBeDisabled();
  const tv = await context.newPage();
  await tv.goto("/audience");
  await expect(tv.locator(".eyebrow")).toContainText("Phân định hòa");
  await page.locator('[data-action=team][data-index="2"]').click();
  await page.getByRole("button", { name: "ĐÚNG (+1)", exact: true }).click();
  await expect(tv.locator(".score-strip b")).toHaveText(["0", "0", "1", "0"]);
  await page.locator("#liveTimerEnabled").uncheck();
  await expect(tv.locator("[data-clock]")).toBeHidden();
  await page.getByRole("button", { name: "03 · Điểm số & kết quả" }).click();
  await page.getByRole("button", { name: "CÔNG BỐ TỔ CHIẾN THẮNG" }).click();
  await expect(
    tv.getByRole("heading", { name: "Tổ 3", exact: true }),
  ).toBeVisible();
});

test("timer warning is opt-in; pause/resume and timeout keep question and team", async ({
  page,
  context,
  request,
}) => {
  let s = await (await request.get("/api/state")).json();
  await request.post("/api/action", {
    headers: { Origin: "http://127.0.0.1:2011" },
    data: { type: "reset", revision: s.revision },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "⚙ Thiết lập" }).click();
  await page.locator("#seconds").fill("5");
  await page.locator("#timerEnabled").check();
  await page.locator("#warningSound").check();
  await page.locator("#autoPass").uncheck();
  await page
    .getByRole("button", { name: "Lưu thiết lập", exact: true })
    .click();
  await page.getByRole("button", { name: "02 · Điều khiển trực tiếp" }).click();
  await page.getByRole("button", { name: "HIỆN CÂU HỎI", exact: true }).click();
  const tv = await context.newPage();
  await tv.addInitScript(() => {
    window.warningCount = 0;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      window.warningCount++;
      return original.apply(this, args);
    };
  });
  await tv.goto("/audience");
  await tv.getByRole("button", { name: "Bật âm thanh" }).click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tiếp tục", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(tv.locator("[data-clock]")).toHaveText("00s", { timeout: 8000 });
  await expect.poll(() => tv.evaluate(() => window.warningCount)).toBe(1);
  s = await (await request.get("/api/state")).json();
  expect(s.live.team).toBe(0);
  expect(s.live.settled).toBe(false);
  expect(s.live.questionId).toBe(s.questions[0].id);
});
