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
    assert.equal(s.live.team, 1);
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
