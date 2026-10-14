import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, act, audience, remaining, validate } from "../game.mjs";
const open = () => {
  let s = initial();
  return act(s, { type: "select", id: s.questions[0].id });
};
test("21 placeholders with correct category counts", () => {
  const s = initial();
  assert.equal(s.questions.length, 21);
  assert.deepEqual(
    ["mv", "other", "special", "backup", "tie"].map(
      (c) => s.questions.filter((q) => q.category === c).length,
    ),
    [8, 4, 1, 3, 5],
  );
  validate(s);
});
test("wrong answer passes, correct gives one point, next begins after winner", () => {
  let s = open();
  s = act(s, { type: "pass" });
  assert.equal(s.live.team, 1);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[1].score, 1);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[1].score, 1);
  s = act(s, { type: "next" });
  assert.equal(s.live.team, 2);
  assert.equal(s.live.reveal, false);
});
test("four distinct failures open discussion; manual volunteer can win", () => {
  let s = open();
  for (let i = 0; i < 4; i++) s = act(s, { type: "pass" });
  assert.equal(s.live.mode, "discussion");
  s = act(s, { type: "team", index: 3 });
  s = act(s, { type: "correct" });
  assert.equal(s.teams[3].score, 1);
  s = act(s, { type: "next" });
  assert.equal(s.live.team, 0);
});
test("special question never gives team points", () => {
  let s = initial();
  s = act(s, { type: "select", id: s.questions[12].id });
  s = act(s, { type: "correct" });
  assert.deepEqual(
    s.teams.map((t) => t.score),
    [0, 0, 0, 0],
  );
  s = act(s, { type: "winner", name: "Người thắng" });
  assert.equal(s.live.mode, "winner");
});
test("answer and hint never sent to audience before explicit reveal", () => {
  let s = open();
  for (const key of ["correct", "answer", "hint", "explanation"])
    assert.equal(key in audience(s).question, false);
  s = act(s, { type: "hint" });
  assert.ok("hint" in audience(s).question);
  assert.equal("answer" in audience(s).question, false);
  s = act(s, { type: "reveal" });
  assert.ok("answer" in audience(s).question);
  s = act(s, { type: "reveal" });
  assert.equal("answer" in audience(s).question, false);
});
test("undo restores score, question, team and paused timer", () => {
  let s = open();
  s = act(s, { type: "timer" });
  s = act(s, { type: "correct" });
  s = act(s, { type: "undo" });
  assert.equal(s.teams[0].score, 0);
  assert.equal(s.live.settled, false);
  assert.equal(s.live.deadline, null);
  assert.ok(s.live.remaining > 0);
});
test("reselecting answered question cannot award twice; reset clears award ledger", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "correct" });
  s = act(s, { type: "select", id });
  s = act(s, { type: "correct" });
  assert.equal(s.teams[0].score, 1);
  s = act(s, { type: "reset" });
  s = act(s, { type: "select", id });
  s = act(s, { type: "correct" });
  assert.equal(s.teams[0].score, 1);
});
test("timer pauses and expires with optional auto pass", () => {
  let s = open();
  s = act(s, { type: "timer" });
  assert.ok(s.live.deadline);
  assert.ok(remaining(s) <= 30000);
  s = act(s, { type: "timer" });
  assert.equal(s.live.deadline, null);
  s = act(s, { type: "expired" });
  assert.equal(s.live.team, 0);
  s.settings.autoPass = true;
  s = act(s, { type: "expired" });
  assert.equal(s.live.team, 1);
});
test("CRUD reorder and delete active question safely", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "duplicate", id });
  assert.equal(s.questions.length, 22);
  assert.notEqual(s.questions[0].id, s.questions[1].id);
  s = act(s, { type: "move", id, delta: 1 });
  assert.equal(s.questions[1].id, id);
  s = act(s, { type: "delete", id });
  assert.equal(s.live.mode, "welcome");
  assert.equal(s.live.questionId, null);
  s = act(s, { type: "undo" });
  assert.equal(s.live.questionId, id);
});
test("invalid backup, settings and media paths rejected", () => {
  for (const mutate of [
    (s) => (s.teams = []),
    (s) => (s.settings.seconds = -1),
    (s) =>
      (s.questions[0].media = [
        { file: "../../secret", kind: "image", name: "x" },
      ]),
    (s) => (s.live.team = 7),
    (s) => (s.questions[0].correct = 99),
  ]) {
    const s = initial();
    mutate(s);
    assert.throws(() => validate(s));
  }
});
test("manual score correction undo and configurable backup/tie scores", () => {
  let s = open();
  s = act(s, {
    type: "teams",
    teams: s.teams.map((t) => ({ ...t, score: 5 })),
  });
  assert.equal(s.teams[0].score, 5);
  s = act(s, { type: "undo" });
  assert.equal(s.teams[0].score, 0);
  s.settings.tiePoints = 0;
  s = act(s, { type: "select", id: s.questions[16].id });
  s = act(s, { type: "correct" });
  assert.equal(s.teams[0].score, 0);
});
test("scoring freezes the actual remaining countdown", () => {
  let s = open();
  s.live.deadline = Date.now() + 12000;
  s = act(s, { type: "correct" });
  assert.equal(s.live.deadline, null);
  assert.ok(s.live.remaining > 11000 && s.live.remaining <= 12000);
});
