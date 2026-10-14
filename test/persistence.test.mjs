import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
test("server restart keeps scores and content; rejected restore preserves data", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "studio-persist-")),
    base = "http://127.0.0.1:2012";
  let child;
  async function start() {
    child = spawn(process.execPath, ["server.mjs"], {
      env: { ...process.env, PORT: "2012", STUDIO_DATA: dir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await Promise.race([
      once(child.stdout, "data"),
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("Startup timeout")), 5000).unref(),
      ),
    ]);
  }
  async function stop() {
    child.kill();
    await once(child, "exit");
    child = null;
  }
  async function state() {
    return (await fetch(base + "/api/state")).json();
  }
  async function act(type, extra = {}) {
    const s = await state();
    const res = await fetch(base + "/api/action", {
      method: "POST",
      headers: { Origin: base },
      body: JSON.stringify({ type, ...extra, revision: s.revision }),
    });
    assert.equal(res.status, 200);
  }
  try {
    await start();
    let s = await state();
    await act("select", { id: s.questions[0].id });
    await act("correct");
    await act("next");
    await act("timer");
    await stop();
    await start();
    s = await state();
    assert.equal(s.teams[0].score, 1);
    assert.equal(s.live.team, 0);
    assert.equal(s.scoreLog.length, 1);
    assert.equal(s.live.deadline, null);
    assert.ok(s.live.remaining > 0);
    const bad = await fetch(base + "/api/restore", {
      method: "POST",
      headers: { Origin: base },
      body: JSON.stringify({ format: "studio-2010-v1", state: {}, files: {} }),
    });
    assert.equal(bad.status, 400);
    assert.equal((await state()).teams[0].score, 1);
    const stale = await fetch(base + "/api/action", {
      method: "POST",
      headers: { Origin: base },
      body: JSON.stringify({ type: "reset", revision: -1 }),
    });
    assert.equal(stale.status, 409);
    assert.equal((await state()).teams[0].score, 1);
  } finally {
    if (child) await stop();
    await rm(dir, { recursive: true, force: true });
  }
});

test("startup migrates v1 with byte-for-byte safety copy; v1 restore and v2 hint backups retain files", async () => {
  const fs = await import("node:fs/promises");
  const legacy = JSON.parse(
    await fs.readFile(new URL("./fixtures/v1.json", import.meta.url), "utf8"),
  );
  legacy.teams[0].score = 6;
  legacy.questions[0].title = "Câu hỏi cũ cần giữ nguyên";
  legacy.questions[0].media = [
    { file: "abcd.png", name: "Ảnh cũ", kind: "image" },
  ];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-migrate-"));
  await fs.mkdir(path.join(dir, "media"));
  await fs.writeFile(path.join(dir, "media/abcd.png"), "old-image");
  const original = JSON.stringify(legacy);
  await fs.writeFile(path.join(dir, "game.json"), original);
  const base = "http://127.0.0.1:2013",
    child = spawn(process.execPath, ["server.mjs"], {
      env: { ...process.env, PORT: "2013", STUDIO_DATA: dir },
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    await Promise.race([
      once(child.stdout, "data"),
      new Promise((_, rej) =>
        setTimeout(() => rej(Error("Startup timeout")), 5000).unref(),
      ),
    ]);
    let s = await (await fetch(base + "/api/state")).json();
    assert.equal(s.version, 2);
    assert.equal(s.questions[0].title, legacy.questions[0].title);
    assert.equal(s.teams[0].score, 6);
    const backups = (await fs.readdir(dir)).filter((f) =>
      f.startsWith("before-v2-"),
    );
    assert.equal(backups.length, 1);
    assert.equal(
      await fs.readFile(path.join(dir, backups[0]), "utf8"),
      original,
    );
    const oldBackup = {
      format: "studio-2010-v1",
      state: legacy,
      files: { "abcd.png": Buffer.from("old-image").toString("base64") },
    };
    let res = await fetch(base + "/api/restore", {
      method: "POST",
      headers: { Origin: base },
      body: JSON.stringify(oldBackup),
    });
    assert.equal(res.status, 200);
    s = await (await fetch(base + "/api/state")).json();
    const q = {
      ...s.questions[0],
      hintEnabled: false,
      hintMedia: [{ file: "abcd.png", kind: "image", name: "Gợi ý giữ lại" }],
    };
    res = await fetch(base + "/api/action", {
      method: "POST",
      headers: { Origin: base },
      body: JSON.stringify({
        type: "saveQuestion",
        question: q,
        revision: s.revision,
      }),
    });
    assert.equal(res.status, 200);
    const backup = await (await fetch(base + "/api/backup")).json();
    assert.equal(backup.format, "studio-2010-v2");
    assert.equal(backup.state.questions[0].hintEnabled, false);
    assert.equal(backup.state.questions[0].hintMedia.length, 1);
    assert.equal(backup.files["abcd.png"], oldBackup.files["abcd.png"]);
    res = await fetch(base + "/api/restore", {
      method: "POST",
      headers: { Origin: base },
      body: JSON.stringify(backup),
    });
    assert.equal(res.status, 200);
    assert.equal(
      (await (await fetch(base + "/api/state")).json()).teams[0].score,
      6,
    );
  } finally {
    child.kill();
    await once(child, "exit");
    await fs.rm(dir, { recursive: true, force: true });
  }
});
