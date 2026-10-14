import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initial,
  act,
  audience,
  remaining,
  validate,
  migrate,
} from "../game.mjs";
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
test("giving up transfers, correct gives one point, advancement stays manual", () => {
  let s = open();
  s = act(s, { type: "pass" });
  assert.equal(s.live.team, 1);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[1].score, 1);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[1].score, 1);
  s = act(s, { type: "next" });
  assert.equal(s.live.team, 1);
  assert.equal(s.live.reveal, false);
});
test("four failures do not force discussion; admin explicitly opens volunteers", () => {
  let s = open();
  for (let i = 0; i < 4; i++) s = act(s, { type: "pass" });
  assert.equal(s.live.mode, "question");
  s = act(s, { type: "volunteer" });
  assert.equal(s.live.mode, "discussion");
  s = act(s, { type: "team", index: 3 });
  s = act(s, { type: "correct" });
  assert.equal(s.teams[3].score, 1);
  s = act(s, { type: "next" });
  assert.equal(s.live.team, 3);
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
test("score history records corrections and undo; tiebreak always awards one", () => {
  let s = open();
  s = act(s, {
    type: "teams",
    teams: s.teams.map((t) => ({ ...t, score: 5 })),
  });
  assert.equal(s.teams[0].score, 5);
  s = act(s, { type: "undo" });
  assert.equal(s.teams[0].score, 0);
  s.settings.tiePoints = 0;
  s = act(s, { type: "tieRound", id: s.questions[16].id, teams: [0, 2] });
  s = act(s, { type: "correct" });
  assert.equal(s.teams[0].score, 1);
  assert.equal(s.scoreLog[4].reason, "Hoàn tác");
});
test("scoring freezes the actual remaining countdown", () => {
  let s = open();
  s.live.deadline = Date.now() + 12000;
  s = act(s, { type: "correct" });
  assert.equal(s.live.deadline, null);
  assert.ok(s.live.remaining > 11000 && s.live.remaining <= 12000);
});

test("incorrect keeps question/team active, no points or reveal; manual selection overrides", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "chooseOption", index: 2 });
  s = act(s, { type: "incorrect" });
  assert.equal(s.live.questionId, id);
  assert.equal(s.live.settled, false);
  assert.equal(s.live.team, 0);
  assert.equal(s.live.reveal, false);
  assert.equal(s.teams[0].score, 0);
  s = act(s, { type: "team", index: 3 });
  assert.equal(s.live.team, 3);
  assert.equal(s.live.selectedOption, null);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[3].score, 1);
  assert.equal(s.live.questionId, id);
});
test("selected option stays private and admin can override stored judgment", () => {
  let s = open();
  s = act(s, { type: "chooseOption", index: 2 });
  assert.equal(s.live.selectedOption, 2);
  assert.equal("selectedOption" in audience(s).live, false);
  assert.equal("correct" in audience(s).question, false);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[0].score, 1);
  assert.equal("correct" in audience(s).question, false);
});
test("disabled hint preserves text and media but never sends them to TV", () => {
  let s = open(),
    q = s.questions[0];
  q.hint = "Bí mật";
  q.hintMedia = [{ file: "abcd.mp3", kind: "audio", name: "Gợi ý" }];
  q.hintEnabled = false;
  s = act(s, { type: "hint" });
  assert.equal(s.live.hint, false);
  assert.equal("hintMedia" in audience(s).question, false);
  assert.equal(s.questions[0].hint, "Bí mật");
  s = act(s, { type: "saveQuestion", question: { ...q, hintEnabled: true } });
  s = act(s, { type: "hint" });
  assert.equal(audience(s).question.hintMedia[0].file, "abcd.mp3");
  s = act(s, { type: "hintMedia" });
  assert.equal(s.live.hintPlaying, true);
  s = act(s, {
    type: "saveQuestion",
    question: { ...s.questions[0], hintEnabled: false },
  });
  assert.equal(s.live.hint, false);
  assert.equal(s.live.hintPlaying, false);
  assert.equal(s.questions[0].hintMedia.length, 1);
});
test("timer can be disabled, and expiry never ends question by default", () => {
  let s = open();
  s = act(s, { type: "timer" });
  s = act(s, {
    type: "settings",
    settings: { ...s.settings, timerEnabled: false },
  });
  assert.equal(s.live.deadline, null);
  s = act(s, { type: "timer" });
  assert.equal(s.live.deadline, null);
  s = act(s, { type: "expired" });
  assert.equal(s.live.settled, false);
  assert.equal(s.live.team, 0);
});
test("tiebreak requires explicit activation and confines answers to chosen participants", () => {
  let s = open(),
    id = s.questions.find((q) => q.category === "tie").id;
  assert.throws(() => act(s, { type: "select", id }));
  s = act(s, { type: "tieRound", teams: [1, 3], id });
  assert.equal(s.live.team, 1);
  assert.throws(() => act(s, { type: "team", index: 0 }));
  s = act(s, { type: "giveup" });
  assert.equal(s.live.team, 3);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[3].score, 1);
});
test("v1 migration preserves every question field, media, team, score and awards", () => {
  const old = JSON.parse(
    readFileSync(new URL("./fixtures/v1.json", import.meta.url)),
  );
  old.teams[2].score = 7;
  old.questions[0].hint = "Gợi ý cũ";
  old.live.awarded = [old.questions[0].id];
  const s = migrate(old);
  assert.equal(old.version, 1);
  assert.equal(s.version, 2);
  assert.deepEqual(s.teams, old.teams);
  assert.deepEqual(s.live.awarded, old.live.awarded);
  old.questions.forEach((q, i) =>
    Object.entries(q).forEach(([k, v]) =>
      assert.deepEqual(s.questions[i][k], v),
    ),
  );
  assert.equal(s.questions[0].hintEnabled, true);
  assert.deepEqual(migrate(s), s);
});
test("open-ended questions can be judged without entering a response", () => {
  let s = open();
  s.questions[0].type = "open";
  s = act(s, { type: "incorrect" });
  assert.equal(s.teams[0].score, 0);
  assert.equal(s.live.settled, false);
  s = act(s, { type: "correct" });
  assert.equal(s.teams[0].score, 1);
});
