import { randomUUID } from "node:crypto";
export const categories = ["mv", "other", "backup", "special", "video"];
export function question(category = "mv", n = 1) {
  return {
    id: randomUUID(),
    category,
    type:
      category === "video"
        ? "video"
        : category === "special"
          ? "open"
          : "choice",
    title:
      category === "video"
        ? "Video đặc biệt"
        : `[Nội dung cần biên soạn] Câu ${n}`,
    options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    correct: 0,
    answer: "Đáp án tham khảo cần biên soạn",
    hint: "Gợi ý cần biên soạn",
    hintEnabled: true,
    hintMedia: [],
    explanation: "",
    media: [],
  };
}
export function initial() {
  return {
    version: 4,
    scoreLog: [],
    questions: [
      ...Array.from({ length: 8 }, (_, i) => question("mv", i + 1)),
      ...Array.from({ length: 4 }, (_, i) => question("other", i + 9)),
      ...Array.from({ length: 5 }, (_, i) => question("backup", i + 13)),
      question("special", 18),
      question("video", 19),
    ],
    teams: Array.from({ length: 4 }, (_, i) => ({
      name: `Tổ ${i + 1}`,
      score: 0,
    })),
    settings: {
      seconds: 30,
      timerEnabled: true,
      warningSound: false,
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
      selectedOption: null,
      resolved: [],
      freeForAll: false,
      tieActive: false,
      tieTeams: [0, 1, 2, 3],
      expiredAt: 0,
      feedbackTeam: null,
      hintPlaying: false,
      hintEpoch: 0,
      winnerKind: "team",
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
      videoPosition: 0,
      videoStartedAt: null,
      videoVolume: 1,
      videoMuted: false,
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
      live: {
        ...s.live,
        remaining: remaining(s),
        deadline: null,
        videoPosition: videoPosition(s),
        videoStartedAt: null,
        mediaPlaying: false,
      },
    }),
  );
  if (s.history.length > 40) s.history.shift();
}
// Migration is additive: original question text, answer IDs, media and scores survive.
export function migrate(input) {
  const s = structuredClone(input);
  if (s?.version === 1) {
    if (!Array.isArray(s.questions) || !s.live || !s.settings)
      throw Error("Dữ liệu bản cũ không hợp lệ.");
    s.version = 2;
    s.scoreLog = [];
    s.history = [];
    s.settings = { timerEnabled: true, warningSound: false, ...s.settings };
    s.live = {
      selectedOption: null,
      tieActive: false,
      tieTeams: [0, 1, 2, 3],
      expiredAt: 0,
      feedbackTeam: null,
      hintPlaying: false,
      hintEpoch: 0,
      winnerKind: "team",
      ...s.live,
    };
    for (const q of s.questions) {
      q.hintEnabled = q.hintEnabled ?? Boolean(q.hint?.trim());
      q.hintMedia = q.hintMedia ?? [];
    }
    if (s.questions.find((q) => q.id === s.live.questionId)?.category === "tie")
      s.live.tieActive = true;
  }
  if (s?.version === 2) {
    s.version = 3;
    s.history = [];
    for (const q of s.questions) {
      if (q.category === "tie") q.category = "backup";
      if (q.category === "special" && q.type === "choice") {
        const correct = q.options?.[q.correct];
        if (correct && correct !== q.answer)
          q.answer =
            correct + (q.answer ? "\nTham khảo trước đây: " + q.answer : "");
        q.type = "open";
      }
    }
    s.live.resolved = [
      ...new Set([
        ...s.live.awarded,
        ...(s.live.settled && s.live.questionId ? [s.live.questionId] : []),
      ]),
    ];
    s.live.freeForAll = s.live.mode === "discussion";
    if (s.live.mode === "discussion") s.live.mode = "question";
    const q = s.questions.find((q) => q.id === s.live.questionId);
    if (
      s.live.freeForAll ||
      q?.category === "special" ||
      q?.category === "backup"
    )
      s.live.team = null;
  }
  if (s?.version === 3) {
    s.version = 4;
    s.history = [];
    s.questions.sort(
      (a, b) => categories.indexOf(a.category) - categories.indexOf(b.category),
    );
    if (!s.questions.some((q) => q.category === "video"))
      s.questions.push(question("video", 19));
    Object.assign(s.live, {
      videoPosition: 0,
      videoStartedAt: null,
      videoVolume: 1,
      videoMuted: false,
      reveal: false,
      selectedOption: null,
      feedback: "",
      feedbackTeam: null,
    });
  }
  validate(s);
  return s;
}
export function videoPosition(s, now = Date.now()) {
  return (
    s.live.videoPosition +
    (s.live.videoStartedAt === null
      ? 0
      : Math.max(0, now - s.live.videoStartedAt) / 1000)
  );
}
function logScores(s, before, reason) {
  s.teams.forEach((t, i) => {
    if (t.score !== before[i].score)
      s.scoreLog.push({
        id: randomUUID(),
        at: Date.now(),
        team: i,
        name: t.name,
        before: before[i].score,
        after: t.score,
        reason,
        questionId: s.live.questionId,
      });
  });
}
function select(s, id) {
  const q = s.questions.find((q) => q.id === id);
  if (!q) throw Error("Không tìm thấy câu hỏi.");
  Object.assign(s.live, {
    questionId: id,
    team: ["special", "backup", "video"].includes(q.category)
      ? null
      : s.live.nextTeam,
    failed: [],
    freeForAll: false,
    hint: false,
    reveal: false,
    feedback: "",
    feedbackTeam: null,
    selectedOption: null,
    mode: "waiting",
    remaining: s.settings.seconds * 1000,
    deadline: null,
    expiredAt: 0,
    settled: s.live.resolved.includes(id) || s.live.awarded.includes(id),
    winner: "",
    mediaPlaying: false,
    videoPosition: 0,
    videoStartedAt: null,
    hintPlaying: false,
  });
}
function playable(s) {
  return (
    s.live.mode === "question" &&
    !s.live.settled &&
    s.questions.some(
      (q) => q.id === s.live.questionId && q.category !== "video",
    )
  );
}
function finish(s) {
  const l = s.live,
    q = s.questions.find((q) => q.id === l.questionId);
  l.remaining = remaining(s);
  l.deadline = null;
  l.reveal = true;
  l.settled = true;
  if (!l.resolved.includes(q.id)) l.resolved.push(q.id);
  const lastTeam = l.team ?? l.feedbackTeam;
  if (q.category !== "special" && lastTeam !== null)
    l.nextTeam = (lastTeam + 1) % 4;
}
function judge(s, correct) {
  if (!playable(s)) return;
  const l = s.live,
    q = s.questions.find((q) => q.id === l.questionId);
  if (q.category !== "special" && l.team === null)
    throw Error("Hãy chọn tổ giành quyền trả lời trước khi chấm.");
  l.remaining = remaining(s);
  l.deadline = null;
  l.feedbackTeam = l.team;
  if (correct) {
    if (q.category !== "special" && !l.awarded.includes(q.id))
      s.teams[l.team].score += 1;
    if (!l.awarded.includes(q.id)) l.awarded.push(q.id);
    l.feedback = "correct";
    finish(s);
  } else {
    l.feedback = "incorrect";
    if (l.freeForAll || q.category === "backup" || q.category === "special") {
      l.reveal = false;
      if (q.category !== "special") l.team = null;
    } else finish(s);
  }
}
function giveup(s) {
  if (!playable(s)) return;
  const l = s.live,
    q = s.questions.find((q) => q.id === l.questionId);
  if (q.category === "special") return;
  if (l.team === null) throw Error("Hãy chọn tổ trước khi chuyển lượt.");
  l.feedbackTeam = l.team;
  l.remaining = s.settings.seconds * 1000;
  l.deadline = null;
  l.feedback = "giveup";
  l.selectedOption = null;
  if (!l.failed.includes(l.team)) l.failed.push(l.team);
  if (l.failed.length === 4 || l.freeForAll || q.category === "backup") {
    if (l.failed.length === 4) l.freeForAll = true;
    l.team = null;
  } else l.team = (l.team + 1) % 4;
}
export function act(old, a) {
  const s = structuredClone(old);
  if (a.type === "undo") {
    const h = s.history.pop();
    if (h) {
      const before = structuredClone(s.teams);
      Object.assign(s, h);
      logScores(s, before, "Hoàn tác");
    }
    return s;
  }
  remember(s);
  const beforeScores = structuredClone(s.teams);
  const l = s.live,
    q = s.questions.find((q) => q.id === l.questionId);
  switch (a.type) {
    case "select":
      select(s, a.id);
      break;
    case "show":
      if (a.id && a.id !== l.questionId) select(s, a.id);
      if (l.questionId) {
        const current = s.questions.find((x) => x.id === l.questionId);
        l.reveal = false;
        l.selectedOption = null;
        l.feedback = "";
        l.feedbackTeam = null;
        l.hint = false;
        l.hintPlaying = false;
        l.expiredAt = 0;
        l.remaining = s.settings.seconds * 1000;
        l.mode = current.category === "video" ? "video" : "question";
        l.deadline =
          s.settings.timerEnabled && l.mode === "question"
            ? Date.now() + l.remaining
            : null;
        if (l.mode === "video") {
          l.team = null;
          l.videoPosition = 0;
          l.videoStartedAt = Date.now();
          l.mediaPlaying = true;
          l.mediaEpoch++;
        }
      }
      break;
    case "previous":
    case "next": {
      const i = s.questions.findIndex((q) => q.id === l.questionId);
      const target = s.questions[i + (a.type === "previous" ? -1 : 1)];
      if (target) select(s, target.id);
      else {
        l.mode = "score";
        l.deadline = null;
      }
      break;
    }
    case "team":
      if (q?.category === "video") break;
      if (!Number.isInteger(a.index) || a.index < 0 || a.index > 3)
        throw Error("Đội không hợp lệ.");
      l.team = a.index;
      l.selectedOption = null;
      l.feedback = "";
      l.remaining = remaining(s);
      l.deadline = null;
      break;
    case "incorrect":
      judge(s, false);
      break;
    case "giveup":
    case "pass":
      giveup(s);
      break;
    case "correct":
      judge(s, true);
      break;
    case "adjustScore":
      if (q?.category === "video") break;
      if (
        !Number.isInteger(a.index) ||
        a.index < 0 ||
        a.index > 3 ||
        ![1, -1].includes(a.delta)
      )
        throw Error("Điều chỉnh điểm không hợp lệ.");
      s.teams[a.index].score += a.delta;
      break;
    case "hint":
      if (!q?.hintEnabled || l.mode !== "question") break;
      l.hint = !l.hint;
      if (!l.hint) l.hintPlaying = false;
      break;
    case "reveal":
      if (q && q.category !== "video" && l.mode === "question" && !l.reveal) {
        l.feedback = "revealed";
        if (!l.settled) finish(s);
        else {
          l.reveal = true;
          l.remaining = remaining(s);
          l.deadline = null;
        }
      }
      break;
    case "timer":
      if (
        !s.settings.timerEnabled ||
        l.mode !== "question" ||
        q?.category === "video"
      )
        break;
      l.expiredAt = 0;
      if (l.deadline !== null) {
        l.remaining = remaining(s);
        l.deadline = null;
      } else {
        if (l.remaining <= 0) l.remaining = s.settings.seconds * 1000;
        l.deadline = Date.now() + l.remaining;
      }
      break;
    case "resetTimer":
      l.expiredAt = 0;
      l.deadline = null;
      l.remaining = s.settings.seconds * 1000;
      break;
    case "expired":
      l.deadline = null;
      l.remaining = 0;
      l.expiredAt = Date.now();
      if (s.settings.autoPass && l.team !== null) giveup(s);
      break;
    case "videoPlayback":
      if (q?.category !== "video" || l.mode !== "video") break;
      l.videoPosition = videoPosition(s);
      l.mediaPlaying = !l.mediaPlaying;
      l.videoStartedAt = l.mediaPlaying ? Date.now() : null;
      l.mediaEpoch++;
      break;
    case "videoRestart":
      if (q?.category !== "video" || l.mode !== "video") break;
      l.videoPosition = 0;
      l.videoStartedAt = Date.now();
      l.mediaPlaying = true;
      l.mediaEpoch++;
      break;
    case "videoAudio":
      if (q?.category !== "video") break;
      if (a.volume !== undefined) {
        if (!Number.isFinite(a.volume) || a.volume < 0 || a.volume > 1)
          throw Error("Âm lượng không hợp lệ.");
        l.videoVolume = a.volume;
      }
      if (a.muted !== undefined) {
        if (typeof a.muted !== "boolean")
          throw Error("Trạng thái âm thanh không hợp lệ.");
        l.videoMuted = a.muted;
      }
      break;
    case "mode":
      if (!["welcome", "score"].includes(a.mode))
        throw Error("Chế độ không hợp lệ.");
      l.remaining = remaining(s);
      l.mode = a.mode;
      l.deadline = null;
      break;
    case "winner":
      l.remaining = remaining(s);
      l.winner = String(a.name).trim().slice(0, 200);
      l.winnerKind = a.kind === "individual" ? "individual" : "team";
      l.mode = "winner";
      l.deadline = null;
      break;
    case "chooseOption":
      if (
        !q ||
        q.type !== "choice" ||
        !Number.isInteger(a.index) ||
        a.index < 0 ||
        a.index >= q.options.length
      )
        throw Error("Phương án không hợp lệ.");
      if (!playable(s)) break;
      l.selectedOption = a.index;
      judge(s, a.index === q.correct);
      break;
    case "hintMedia":
      if (q?.hintEnabled && l.hint && l.mode === "question") {
        l.hintPlaying = !l.hintPlaying;
        l.hintEpoch = Date.now();
      }
      break;
    case "media":
      if (l.mode !== "question") break;
      l.mediaPlaying = !l.mediaPlaying;
      l.mediaEpoch = Date.now();
      break;
    case "saveQuestion": {
      const i = s.questions.findIndex((q) => q.id === a.question.id);
      if (i < 0) s.questions.push(a.question);
      else s.questions[i] = a.question;
      if (l.questionId === a.question.id) {
        l.selectedOption = null;
        if (!a.question.hintEnabled) {
          l.hint = false;
          l.hintPlaying = false;
        }
      }
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
      if (!s.settings.timerEnabled) {
        l.remaining = remaining(s);
        l.deadline = null;
      }
      break;
    case "reset":
      s.teams.forEach((t) => (t.score = 0));
      s.live = initial().live;
      s.live.remaining = s.settings.seconds * 1000;
      break;
    default:
      throw Error("Thao tác không hợp lệ.");
  }
  if (["saveQuestion", "move", "duplicate"].includes(a.type))
    s.questions.sort(
      (a, b) => categories.indexOf(a.category) - categories.indexOf(b.category),
    );
  const reasons = {
    correct: "Trả lời đúng",
    teams: "Điều chỉnh thủ công",
    adjustScore: "Điều chỉnh trực tiếp",
    chooseOption: "Trả lời đúng",
    reset: "Bắt đầu sự kiện mới",
  };
  logScores(s, beforeScores, reasons[a.type] || "Điều chỉnh điểm");
  validate(s);
  return s;
}
export function validate(s) {
  const str = (x, max = 10000) => typeof x === "string" && x.length <= max;
  if (
    !s ||
    s.version !== 4 ||
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
      !["choice", "open", "video"].includes(q.type) ||
      (q.category === "video") !== (q.type === "video") ||
      (q.category === "video" &&
        (q.media.length > 1 ||
          q.media.some(
            (m) => m.kind !== "video" || !m.file.endsWith(".mp4"),
          ))) ||
      (q.category === "special" && q.type !== "open") ||
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
      !Array.isArray(q.hintMedia) ||
      q.hintMedia.length > 10 ||
      typeof q.hintEnabled !== "boolean" ||
      !Array.isArray(q.media) ||
      q.media.length > 10 ||
      ![...q.media, ...q.hintMedia].every(
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
    typeof c.timerEnabled !== "boolean" ||
    typeof c.warningSound !== "boolean" ||
    typeof c.autoPass !== "boolean" ||
    typeof c.discussion !== "boolean"
  )
    throw Error("Cài đặt không hợp lệ.");
  if (
    !l ||
    !(
      l.team === null ||
      (Number.isInteger(l.team) && l.team >= 0 && l.team < 4)
    ) ||
    !(Number.isInteger(l.nextTeam) && l.nextTeam >= 0 && l.nextTeam < 4) ||
    !(l.questionId === null || ids.has(l.questionId)) ||
    !["welcome", "waiting", "question", "video", "score", "winner"].includes(
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
    !Number.isFinite(l.videoPosition) ||
    l.videoPosition < 0 ||
    !(l.videoStartedAt === null || Number.isFinite(l.videoStartedAt)) ||
    !Number.isFinite(l.videoVolume) ||
    l.videoVolume < 0 ||
    l.videoVolume > 1 ||
    typeof l.videoMuted !== "boolean" ||
    !["", "correct", "incorrect", "giveup", "skipped", "revealed"].includes(
      l.feedback,
    )
  )
    throw Error("Trạng thái trò chơi không hợp lệ.");
  if (
    !(
      l.selectedOption === null ||
      (Number.isInteger(l.selectedOption) &&
        l.selectedOption >= 0 &&
        l.selectedOption < 10)
    ) ||
    typeof l.freeForAll !== "boolean" ||
    !Array.isArray(l.resolved) ||
    !l.resolved.every((x) => str(x, 100)) ||
    typeof l.tieActive !== "boolean" ||
    !Array.isArray(l.tieTeams) ||
    l.tieTeams.length < 2 ||
    new Set(l.tieTeams).size !== l.tieTeams.length ||
    !l.tieTeams.every((n) => Number.isInteger(n) && n >= 0 && n < 4) ||
    !Number.isFinite(l.expiredAt) ||
    ![null, 0, 1, 2, 3].includes(l.feedbackTeam) ||
    typeof l.hintPlaying !== "boolean" ||
    !Number.isFinite(l.hintEpoch) ||
    !["team", "individual"].includes(l.winnerKind)
  )
    throw Error("Thông tin lượt chơi không hợp lệ.");
  if (
    !Array.isArray(s.scoreLog) ||
    !s.scoreLog.every(
      (e) =>
        str(e.id, 100) &&
        Number.isFinite(e.at) &&
        Number.isInteger(e.team) &&
        e.team >= 0 &&
        e.team < 4 &&
        str(e.name, 100) &&
        Number.isInteger(e.before) &&
        Number.isInteger(e.after) &&
        str(e.reason, 200),
    )
  )
    throw Error("Lịch sử điểm không hợp lệ.");
}
export function audience(s) {
  const q = s.questions.find((q) => q.id === s.live.questionId);
  return {
    teams: s.teams,
    settings: {
      title: s.settings.title,
      prize: s.settings.prize,
      accent: s.settings.accent,
      timerEnabled: s.settings.timerEnabled,
      warningSound: s.settings.warningSound,
      specialRules:
        q?.category === "special" ? s.settings.specialRules : undefined,
    },
    live: Object.fromEntries(
      Object.entries(s.live).filter(
        ([key]) =>
          ![
            "selectedOption",
            "awarded",
            "failed",
            "nextTeam",
            "resolved",
            "tieTeams",
            "tieActive",
          ].includes(key),
      ),
    ),
    question: q
      ? {
          id: q.id,
          number: s.questions.findIndex((x) => x.id === q.id) + 1,
          category: q.category,
          ...(s.live.mode !== "waiting"
            ? {
                title: q.title,
                type: q.type,
                category: q.category,
                options: q.category === "video" ? undefined : q.options,
                media: q.media,
                ...(q.category !== "video" && s.live.hint && q.hintEnabled
                  ? { hint: q.hint, hintMedia: q.hintMedia }
                  : {}),
                ...(s.live.mode === "question" &&
                s.live.reveal &&
                q.category !== "video"
                  ? {
                      correct: q.correct,
                      answer: q.answer,
                      explanation: q.explanation,
                    }
                  : {}),
              }
            : {}),
        }
      : null,
    serverTime: Date.now(),
  };
}
