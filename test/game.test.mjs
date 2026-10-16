import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initial, act, audience, migrate, validate } from "../game.mjs";
function open(category = "mv") {
  let s = initial();
  return act(s, {
    type: "show",
    id: s.questions.find((q) => q.category === category).id,
  });
}
function free() {
  let s = open();
  for (let i = 0; i < 4; i++) s = act(s, { type: "giveup" });
  return s;
}
test("19 defaults, five categories, special is open-ended", () => {
  const s = initial();
  assert.equal(s.questions.length, 19);
  assert.deepEqual(
    ["mv", "other", "backup", "special", "video"].map(
      (c) => s.questions.filter((q) => q.category === c).length,
    ),
    [8, 4, 5, 1, 1],
  );
  assert.equal(s.questions[17].type, "open");
  validate(s);
});
test("select and next/previous enter waiting; content only sent after show", () => {
  let s = initial();
  s = act(s, { type: "select", id: s.questions[0].id });
  assert.equal(s.live.mode, "waiting");
  assert.deepEqual(Object.keys(audience(s).question).sort(), [
    "category",
    "id",
    "number",
  ]);
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[0].score, 0);
  s = act(s, { type: "reveal" });
  assert.equal(s.live.reveal, false);
  s = act(s, { type: "show" });
  assert.equal(audience(s).question.title, s.questions[0].title);
  s = act(s, { type: "next" });
  assert.equal(s.live.mode, "waiting");
  s = act(s, { type: "previous" });
  assert.equal(s.live.questionId, s.questions[0].id);
  assert.equal(audience(s).question.title, undefined);
});
test("one-click correct adds one, reveals and finishes without advancing", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[0].score, 1);
  assert.equal(s.live.questionId, id);
  assert.equal(s.live.settled, true);
  assert.equal(audience(s).question.correct, 0);
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[0].score, 1);
});
test("wrong normal answer reveals and ends without scoring or passing", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "chooseOption", index: 1 });
  assert.equal(s.teams[0].score, 0);
  assert.equal(s.live.team, 0);
  assert.equal(s.live.questionId, id);
  assert.equal(s.live.settled, true);
  assert.equal(s.live.feedback, "incorrect");
  assert.equal(audience(s).question.correct, 0);
});
test("next regular starts after final answering team, for both correct and wrong", () => {
  for (const index of [0, 1]) {
    let s = open();
    s = act(s, { type: "giveup" });
    assert.equal(s.live.team, 1);
    s = act(s, { type: "chooseOption", index });
    s = act(s, { type: "team", index: 3 });
    s = act(s, { type: "next" });
    assert.equal(s.live.team, 2);
    assert.equal(s.live.mode, "waiting");
  }
});
test("manual team override, wraparound and no automatic question advance", () => {
  let s = open();
  s = act(s, { type: "team", index: 3 });
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[3].score, 1);
  s = act(s, { type: "next" });
  assert.equal(s.live.team, 0);
  s = act(s, { type: "team", index: 2 });
  assert.equal(s.live.team, 2);
});
test("giveup keeps answer hidden, switches team; four unique teams open free-for-all", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "giveup" });
  assert.equal(s.live.team, 1);
  assert.equal(s.live.questionId, id);
  assert.equal(s.live.reveal, false);
  s = act(s, { type: "team", index: 0 });
  s = act(s, { type: "giveup" });
  assert.equal(s.live.failed.length, 1);
  for (const i of [1, 2, 3]) {
    s = act(s, { type: "team", index: i });
    s = act(s, { type: "giveup" });
  }
  assert.equal(s.live.freeForAll, true);
  assert.equal(s.live.team, null);
  assert.equal(s.live.settled, false);
  assert.equal(audience(s).question.correct, undefined);
});
test("free-for-all requires team; wrong stays hidden/deselects; correct adds one and ends", () => {
  let s = free();
  assert.throws(() => act(s, { type: "chooseOption", index: 0 }));
  s = act(s, { type: "team", index: 2 });
  s = act(s, { type: "chooseOption", index: 1 });
  assert.equal(s.live.team, null);
  assert.equal(s.live.freeForAll, true);
  assert.equal(s.live.settled, false);
  assert.equal(audience(s).question.answer, undefined);
  s = act(s, { type: "team", index: 3 });
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[3].score, 1);
  assert.equal(s.live.reveal, true);
  assert.equal(s.live.settled, true);
});
test("manual reveal ends free-for-all without points; resolved question cannot be replayed", () => {
  let s = free(),
    id = s.live.questionId;
  s = act(s, { type: "reveal" });
  assert.equal(s.live.settled, true);
  assert.equal(s.live.reveal, true);
  assert.deepEqual(
    s.teams.map((t) => t.score),
    [0, 0, 0, 0],
  );
  s = act(s, { type: "select", id });
  s = act(s, { type: "show" });
  s = act(s, { type: "team", index: 0 });
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[0].score, 0);
});
test("special wrong keeps hidden and active; correct reveals without team score or winner input", () => {
  let s = open("special");
  assert.equal(s.live.team, null);
  s = act(s, { type: "incorrect" });
  assert.equal(s.live.reveal, false);
  assert.equal(s.live.settled, false);
  s = act(s, { type: "correct" });
  assert.equal(s.live.reveal, true);
  assert.equal(s.live.settled, true);
  assert.deepEqual(
    s.teams.map((t) => t.score),
    [0, 0, 0, 0],
  );
  assert.equal(s.live.winner, "");
});
test("backup freely selects any team, wrong stays hidden, correct always one", () => {
  let s = open("backup");
  s.settings.backupPoints = 8;
  assert.equal(s.live.team, null);
  s = act(s, { type: "team", index: 1 });
  s = act(s, { type: "chooseOption", index: 1 });
  assert.equal(s.live.team, null);
  assert.equal(s.live.settled, false);
  assert.equal(s.live.reveal, false);
  s = act(s, { type: "team", index: 3 });
  s = act(s, { type: "chooseOption", index: 0 });
  assert.equal(s.teams[3].score, 1);
  assert.equal(s.live.reveal, true);
});
test("open-ended regular wrong ends; manual reveal also ends backup", () => {
  let s = open();
  s.questions[0].type = "open";
  s = act(s, { type: "incorrect" });
  assert.equal(s.live.settled, true);
  assert.equal(s.live.reveal, true);
  s = open("backup");
  s = act(s, { type: "reveal" });
  assert.equal(s.live.settled, true);
});
test("score buttons do not change turn; undo restores score and judging/reveal state", () => {
  let s = open();
  s = act(s, { type: "adjustScore", index: 3, delta: 1 });
  assert.equal(s.live.team, 0);
  assert.equal(s.teams[3].score, 1);
  s = act(s, { type: "undo" });
  assert.equal(s.teams[3].score, 0);
  s = act(s, { type: "chooseOption", index: 0 });
  s = act(s, { type: "undo" });
  assert.equal(s.teams[0].score, 0);
  assert.equal(s.live.reveal, false);
  assert.equal(s.live.settled, false);
  assert.equal(s.live.resolved.length, 0);
  assert.equal(s.scoreLog.at(-1).reason, "Hoàn tác");
});
test("hidden hints/media preserved, selected option stays private until explicit rules reveal", () => {
  let s = open();
  s.questions[0].hintMedia = [
    { file: "abcd.mp3", kind: "audio", name: "Gợi ý" },
  ];
  assert.equal(audience(s).question.hintMedia, undefined);
  s = act(s, { type: "hint" });
  assert.equal(audience(s).question.hintMedia.length, 1);
  s = act(s, { type: "hintMedia" });
  assert.equal(s.live.hintPlaying, true);
  s = act(s, {
    type: "saveQuestion",
    question: { ...s.questions[0], hintEnabled: false },
  });
  assert.equal(s.live.hint, false);
  assert.equal(s.questions[0].hintMedia.length, 1);
  assert.equal(audience(s).question.hintMedia, undefined);
  assert.equal("selectedOption" in audience(s).live, false);
});
test("timer cannot start in waiting and default expiry never ends question or changes teams", () => {
  let s = initial();
  s = act(s, { type: "select", id: s.questions[0].id });
  s = act(s, { type: "timer" });
  assert.equal(s.live.deadline, null);
  s = act(s, { type: "show" });
  assert.ok(s.live.deadline);
  s = act(s, { type: "expired" });
  assert.equal(s.live.settled, false);
  assert.equal(s.live.team, 0);
  s = act(s, {
    type: "settings",
    settings: { ...s.settings, timerEnabled: false },
  });
  s = act(s, { type: "timer" });
  assert.equal(s.live.deadline, null);
});
test("migration preserves all questions/media/IDs and merges tie into backup without deleting", () => {
  for (const version of ["v1", "v2"]) {
    const old = JSON.parse(
      readFileSync(new URL(`./fixtures/${version}.json`, import.meta.url)),
    );
    old.teams[1].score = 7;
    const s = migrate(old);
    assert.equal(s.version, 4);
    assert.equal(s.questions.length, 22);
    assert.equal(s.questions.filter((q) => q.category === "backup").length, 8);
    assert.deepEqual(s.teams, old.teams);
    old.questions.forEach((q, i) => {
      const kept = s.questions.find((x) => x.id === q.id);
      assert.equal(kept.title, q.title);
      assert.deepEqual(kept.options, q.options);
      assert.deepEqual(kept.media, q.media);
      assert.ok(kept.answer.includes(q.answer));
    });
    assert.equal(
      s.questions.find((q) => q.category === "special").type,
      "open",
    );
    assert.deepEqual(migrate(s), s);
  }
});
test("CRUD, undo and reset preserve question content and clear round ledgers", () => {
  let s = open(),
    id = s.live.questionId;
  s = act(s, { type: "duplicate", id });
  assert.equal(s.questions.length, 20);
  s = act(s, { type: "move", id, delta: 1 });
  assert.equal(s.questions[1].id, id);
  s = act(s, { type: "delete", id });
  assert.equal(s.live.questionId, null);
  s = act(s, { type: "undo" });
  assert.equal(s.live.questionId, id);
  s = act(s, { type: "correct" });
  s = act(s, { type: "reset" });
  assert.equal(s.live.resolved.length, 0);
  assert.equal(s.questions[1].id, id);
});
test("invalid data, media traversal and invalid team are rejected", () => {
  for (const mutate of [
    (s) => (s.live.team = 9),
    (s) =>
      (s.questions[0].hintMedia = [
        { name: "x", kind: "image", file: "../x.png" },
      ]),
    (s) => (s.questions[0].category = "tie"),
    (s) => (s.questions[17].type = "choice"),
  ]) {
    const s = initial();
    mutate(s);
    assert.throws(() => validate(s));
  }
});

test("every question hides prior reveal/judgment on select and show, including resolved Question 1", () => {
  for (let i = 0; i < 18; i++) {
    let s = initial();
    const id = s.questions[i].id;
    s = act(s, { type: "show", id });
    s = act(s, { type: "reveal" });
    s.live.selectedOption = 0;
    s = act(s, { type: "show", id });
    assert.equal(s.live.reveal, false);
    assert.equal(s.live.selectedOption, null);
    assert.equal(s.live.feedback, "");
    for (const key of ["correct", "answer", "explanation"])
      assert.equal(audience(s).question[key], undefined);
    s = act(s, { type: "select", id });
    assert.equal(s.live.reveal, false);
    s = act(s, { type: "show" });
    assert.equal(audience(s).question.correct, undefined);
    s = act(s, { type: "reveal" });
    assert.equal(s.live.reveal, true);
    assert.deepEqual(
      s.teams.map((t) => t.score),
      [0, 0, 0, 0],
    );
  }
});
test("show automatically resets and starts enabled timer; pause/resume/reset and disabled timer", () => {
  let s = open();
  assert.ok(s.live.deadline > Date.now());
  s.live.deadline = Date.now() + 12345;
  s = act(s, { type: "timer" });
  assert.equal(s.live.deadline, null);
  assert.ok(s.live.remaining <= 12345);
  s = act(s, { type: "timer" });
  assert.ok(s.live.deadline > Date.now());
  s = act(s, { type: "resetTimer" });
  assert.equal(s.live.remaining, 30000);
  assert.equal(s.live.deadline, null);
  s = act(s, { type: "show" });
  assert.ok(s.live.deadline >= Date.now() + 29900);
  s = act(s, {
    type: "settings",
    settings: { ...s.settings, timerEnabled: false },
  });
  s = act(s, { type: "show" });
  assert.equal(s.live.deadline, null);
});
test("v3 migration preserves all question fields by ID, groups order and appends video exactly once", () => {
  const old = JSON.parse(
    readFileSync(new URL("./fixtures/v3.json", import.meta.url)),
  );
  old.questions[12].media = [
    { file: "abcd.mp4", kind: "video", name: "Nội dung cá nhân" },
  ];
  old.questions[13].hintMedia = [
    { file: "abcd.wav", kind: "audio", name: "Gợi ý cũ" },
  ];
  old.live.questionId = old.questions[12].id;
  old.teams[2].score = 9;
  const s = migrate(old);
  assert.equal(s.questions.length, 19);
  assert.deepEqual(
    s.questions.map((q) => q.category),
    [
      ...Array(8).fill("mv"),
      ...Array(4).fill("other"),
      ...Array(5).fill("backup"),
      "special",
      "video",
    ],
  );
  for (const q of old.questions)
    assert.deepEqual(
      s.questions.find((x) => x.id === q.id),
      q,
    );
  assert.equal(s.live.questionId, old.live.questionId);
  assert.deepEqual(s.teams, old.teams);
  assert.deepEqual(migrate(s), s);
});
test("closing video never grades or counts down; pause/restart/audio control validated", () => {
  let s = open("video");
  assert.equal(s.live.mode, "video");
  assert.equal(s.live.deadline, null);
  assert.equal(s.live.team, null);
  assert.equal(s.live.mediaPlaying, true);
  for (const a of [
    { type: "timer" },
    { type: "correct" },
    { type: "incorrect" },
    { type: "giveup" },
    { type: "reveal" },
    { type: "team", index: 1 },
    { type: "adjustScore", index: 1, delta: 1 },
  ])
    s = act(s, a);
  assert.equal(s.live.reveal, false);
  assert.equal(s.live.deadline, null);
  assert.deepEqual(
    s.teams.map((t) => t.score),
    [0, 0, 0, 0],
  );
  s.live.videoStartedAt = Date.now() - 4000;
  s = act(s, { type: "videoPlayback" });
  assert.equal(s.live.mediaPlaying, false);
  assert.ok(s.live.videoPosition >= 4);
  s = act(s, { type: "videoPlayback" });
  assert.equal(s.live.mediaPlaying, true);
  s = act(s, { type: "videoRestart" });
  assert.equal(s.live.videoPosition, 0);
  s = act(s, { type: "videoAudio", volume: 0.3, muted: true });
  assert.equal(s.live.videoVolume, 0.3);
  assert.equal(audience(s).live.videoMuted, true);
  assert.throws(() => act(s, { type: "videoAudio", volume: 2 }));
});
