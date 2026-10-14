import { randomUUID } from "node:crypto";
export const categories = ["mv", "other", "special", "backup", "tie"];
export function question(category = "mv", n = 1) {
  return {
    id: randomUUID(),
    category,
    type: "choice",
    title: `[Nội dung cần biên soạn] Câu ${n}`,
    options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    correct: 0,
    answer: "Đáp án tham khảo cần biên soạn",
    hint: "Gợi ý cần biên soạn",
    explanation: "",
    media: [],
  };
}
export function initial() {
  return {
    version: 1,
    questions: [
      ...Array.from({ length: 8 }, (_, i) => question("mv", i + 1)),
      ...Array.from({ length: 4 }, (_, i) => question("other", i + 9)),
      question("special", 13),
      ...Array.from({ length: 3 }, (_, i) => question("backup", i + 14)),
      ...Array.from({ length: 5 }, (_, i) => question("tie", i + 17)),
    ],
    teams: Array.from({ length: 4 }, (_, i) => ({
      name: `Đội ${i + 1}`,
      score: 0,
    })),
    settings: {
      seconds: 30,
      autoPass: false,
      discussion: true,
      backupPoints: 1,
      tiePoints: 1,
      accent: "#ebae65",
      title: "Tôn vinh những điều rực rỡ",
      prize: "Giải thưởng đặc biệt",
      specialRules: "Người dẫn chương trình công bố thể lệ tại sự kiện.",
    },
    live: {
      questionId: null,
      team: 0,
      nextTeam: 0,
      failed: [],
      hint: false,
      reveal: false,
      feedback: "",
      mode: "welcome",
      remaining: 30000,
      deadline: null,
      settled: false,
      awarded: [],
      winner: "",
      mediaPlaying: false,
      mediaEpoch: 0,
    },
    history: [],
  };
}
export function remaining(s, now = Date.now()) {
  return s.live.deadline === null
    ? s.live.remaining
    : Math.max(0, s.live.deadline - now);
}
function remember(s) {
  s.history.push(
    structuredClone({
      questions: s.questions,
      teams: s.teams,
      settings: s.settings,
      live: { ...s.live, remaining: remaining(s), deadline: null },
    }),
  );
  if (s.history.length > 40) s.history.shift();
}
function select(s, id) {
  if (!s.questions.some((q) => q.id === id))
    throw Error("Không tìm thấy câu hỏi.");
  Object.assign(s.live, {
    questionId: id,
    team: s.live.nextTeam,
    failed: [],
    hint: false,
    reveal: false,
    feedback: "",
    mode: "question",
    remaining: s.settings.seconds * 1000,
    deadline: null,
    settled: s.live.awarded.includes(id),
    winner: "",
    mediaPlaying: false,
  });
}
function pass(s) {
  if (s.live.settled || !s.live.questionId) return;
  const l = s.live;
  if (!l.failed.includes(l.team)) l.failed.push(l.team);
  l.team = (l.team + 1) % 4;
  l.nextTeam = l.team;
  l.feedback = "incorrect";
  l.remaining = s.settings.seconds * 1000;
  l.deadline = null;
  if (l.failed.length === 4)
    l.mode = s.settings.discussion ? "discussion" : "question";
}
export function act(old, a) {
  const s = structuredClone(old);
  if (a.type === "undo") {
    const h = s.history.pop();
    if (h) Object.assign(s, h);
    return s;
  }
  remember(s);
  const l = s.live,
    q = s.questions.find((q) => q.id === l.questionId);
  switch (a.type) {
    case "select":
      select(s, a.id);
      break;
    case "next": {
      const i = s.questions.findIndex((q) => q.id === l.questionId);
      if (s.questions[i + 1]) select(s, s.questions[i + 1].id);
      else {
        l.mode = "score";
        l.deadline = null;
      }
      break;
    }
    case "skip":
      l.remaining = remaining(s);
      l.nextTeam = (l.team + 1) % 4;
      l.feedback = "skipped";
      l.settled = true;
      l.deadline = null;
      break;
    case "team":
      if (!Number.isInteger(a.index) || a.index < 0 || a.index > 3)
        throw Error("Đội không hợp lệ.");
      l.team = a.index;
      break;
    case "pass":
      pass(s);
      break;
    case "correct":
      if (!q || l.settled) break;
      l.remaining = remaining(s);
      if (q.category !== "special") {
        s.teams[l.team].score +=
          q.category === "backup"
            ? s.settings.backupPoints
            : q.category === "tie"
              ? s.settings.tiePoints
              : 1;
      }
      l.awarded.push(q.id);
      l.settled = true;
      l.feedback = "correct";
      l.nextTeam = (l.team + 1) % 4;
      l.deadline = null;
      break;
    case "hint":
      l.hint = !l.hint;
      break;
    case "reveal":
      l.reveal = !l.reveal;
      break;
    case "timer":
      if (l.deadline !== null) {
        l.remaining = remaining(s);
        l.deadline = null;
      } else {
        if (l.remaining <= 0) l.remaining = s.settings.seconds * 1000;
        l.deadline = Date.now() + l.remaining;
      }
      break;
    case "resetTimer":
      l.deadline = null;
      l.remaining = s.settings.seconds * 1000;
      break;
    case "expired":
      l.deadline = null;
      l.remaining = 0;
      if (s.settings.autoPass) pass(s);
      break;
    case "mode":
      if (!["welcome", "score", "question"].includes(a.mode))
        throw Error("Chế độ không hợp lệ.");
      l.remaining = remaining(s);
      l.mode = a.mode;
      l.deadline = null;
      break;
    case "winner":
      l.remaining = remaining(s);
      l.winner = String(a.name).trim().slice(0, 200);
      l.mode = "winner";
      l.deadline = null;
      break;
    case "media":
      l.mediaPlaying = !l.mediaPlaying;
      l.mediaEpoch = Date.now();
      break;
    case "saveQuestion": {
      const i = s.questions.findIndex((q) => q.id === a.question.id);
      if (i < 0) s.questions.push(a.question);
      else s.questions[i] = a.question;
      break;
    }
    case "delete":
      s.questions = s.questions.filter((q) => q.id !== a.id);
      if (l.questionId === a.id) {
        l.questionId = null;
        l.mode = "welcome";
        l.deadline = null;
      }
      break;
    case "duplicate": {
      const q = s.questions.find((q) => q.id === a.id);
      if (q)
        s.questions.splice(s.questions.indexOf(q) + 1, 0, {
          ...structuredClone(q),
          id: randomUUID(),
          title: q.title + " (bản sao)",
        });
      break;
    }
    case "move": {
      const i = s.questions.findIndex((q) => q.id === a.id),
        j = i + a.delta;
      if (i >= 0 && j >= 0 && j < s.questions.length)
        [s.questions[i], s.questions[j]] = [s.questions[j], s.questions[i]];
      break;
    }
    case "teams":
      s.teams = a.teams;
      break;
    case "settings":
      s.settings = a.settings;
      break;
    case "reset":
      s.teams.forEach((t) => (t.score = 0));
      s.live = initial().live;
      s.live.remaining = s.settings.seconds * 1000;
      break;
    default:
      throw Error("Thao tác không hợp lệ.");
  }
  validate(s);
  return s;
}
export function validate(s) {
  const str = (x, max = 10000) => typeof x === "string" && x.length <= max;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.questions) ||
    s.questions.length > 300 ||
    !Array.isArray(s.teams) ||
    s.teams.length !== 4
  )
    throw Error("Tệp dữ liệu không hợp lệ.");
  const ids = new Set();
  for (const q of s.questions) {
    if (
      !str(q.id, 100) ||
      ids.has(q.id) ||
      !categories.includes(q.category) ||
      !["choice", "open"].includes(q.type) ||
      !str(q.title) ||
      !str(q.hint) ||
      !str(q.answer) ||
      !str(q.explanation) ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 10 ||
      !q.options.every((x) => str(x)) ||
      !Number.isInteger(q.correct) ||
      q.correct < 0 ||
      q.correct >= q.options.length ||
      !Array.isArray(q.media) ||
      q.media.length > 10 ||
      !q.media.every(
        (m) =>
          str(m.name, 200) &&
          ["image", "audio", "video"].includes(m.kind) &&
          /^[a-f0-9-]+\.(png|jpg|webp|gif|mp4|webm|mp3|wav|ogg|m4a)$/.test(
            m.file,
          ),
      )
    )
      throw Error("Câu hỏi hoặc tệp đính kèm không hợp lệ.");
    ids.add(q.id);
  }
  if (
    !s.teams.every(
      (t) =>
        str(t.name, 100) &&
        Number.isInteger(t.score) &&
        Math.abs(t.score) <= 10000,
    )
  )
    throw Error("Tên hoặc điểm đội không hợp lệ.");
  const c = s.settings,
    l = s.live;
  if (
    !c ||
    !Number.isInteger(c.seconds) ||
    c.seconds < 5 ||
    c.seconds > 3600 ||
    ![c.backupPoints, c.tiePoints].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 100,
    ) ||
    !/^#[0-9a-f]{6}$/i.test(c.accent) ||
    ![c.title, c.prize, c.specialRules].every((x) => str(x, 2000)) ||
    typeof c.autoPass !== "boolean" ||
    typeof c.discussion !== "boolean"
  )
    throw Error("Cài đặt không hợp lệ.");
  if (
    !l ||
    ![l.team, l.nextTeam].every(
      (n) => Number.isInteger(n) && n >= 0 && n < 4,
    ) ||
    !(l.questionId === null || ids.has(l.questionId)) ||
    !["welcome", "question", "discussion", "score", "winner"].includes(
      l.mode,
    ) ||
    !Array.isArray(l.failed) ||
    !l.failed.every((n) => Number.isInteger(n) && n >= 0 && n < 4) ||
    !Array.isArray(l.awarded) ||
    !l.awarded.every((x) => str(x, 100)) ||
    !Number.isFinite(l.remaining) ||
    l.remaining < 0 ||
    l.remaining > 3600000 ||
    !(l.deadline === null || Number.isFinite(l.deadline)) ||
    !str(l.winner, 200) ||
    !["hint", "reveal", "settled", "mediaPlaying"].every(
      (k) => typeof l[k] === "boolean",
    ) ||
    !Number.isFinite(l.mediaEpoch) ||
    !["", "correct", "incorrect", "skipped"].includes(l.feedback)
  )
    throw Error("Trạng thái trò chơi không hợp lệ.");
}
export function audience(s) {
  const q = s.questions.find((q) => q.id === s.live.questionId);
  return {
    teams: s.teams,
    settings: {
      title: s.settings.title,
      prize: s.settings.prize,
      accent: s.settings.accent,
      specialRules:
        q?.category === "special" ? s.settings.specialRules : undefined,
    },
    live: s.live,
    question: q
      ? {
          id: q.id,
          title: q.title,
          type: q.type,
          category: q.category,
          options: q.options,
          media: q.media,
          ...(s.live.hint ? { hint: q.hint } : {}),
          ...(s.live.reveal
            ? {
                correct: q.correct,
                answer: q.answer,
                explanation: q.explanation,
              }
            : {}),
        }
      : null,
    serverTime: Date.now(),
  };
}
