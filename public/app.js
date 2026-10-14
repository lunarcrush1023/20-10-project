const $ = (s) => document.querySelector(s),
  app = $("#app"),
  tv = location.pathname === "/audience";
const cats = {
  mv: "Trong MV",
  other: "Chủ đề khác",
  special: "Siêu khó",
  backup: "Dự phòng",
  tie: "Phân định hòa",
};
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let state,
  tab = "live",
  draft = null,
  busy = false,
  offset = 0,
  lastRevision = -1,
  lastInstance = "",
  mediaKey = "",
  lastMediaEpoch = -1,
  toastTimer,
  selectedQuestionId = null,
  lastHintEpoch = -1,
  lastExpiredAt = null,
  audioContext = null;
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 5000);
}
async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Không thể thực hiện.");
  return data;
}
async function refresh(force = false) {
  try {
    const next = await request(tv ? "/api/audience" : "/api/state");
    if (lastInstance !== next.instance) {
      lastInstance = next.instance;
      lastRevision = -1;
    }
    if (next.revision < lastRevision) return;
    offset = next.serverTime - Date.now();
    const changed = next.revision !== lastRevision;
    state = next;
    lastRevision = next.revision;
    $(".connection")?.remove();
    if (
      (changed || force) &&
      (tv ||
        (!draft &&
          (force || !app.firstChild || !["settings", "scores"].includes(tab))))
    )
      render();
    updateClock();
  } catch (e) {
    if (!$(".connection")) {
      const el = document.createElement("div");
      el.className = "connection";
      el.textContent = "Mất kết nối máy chủ. Hãy kiểm tra cửa sổ khởi động.";
      document.body.append(el);
    }
  }
}
async function action(type, extra = {}) {
  if (busy) return;
  busy = true;
  try {
    await request("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...extra, revision: state.revision }),
    });
    await refresh(true);
    return true;
  } catch (e) {
    toast(e.message);
    await refresh(true);
    return false;
  } finally {
    busy = false;
  }
}
function button(text, action, cls = "", attrs = "") {
  return `<button class="${cls}" data-action="${action}" ${attrs}>${text}</button>`;
}
function qCurrent() {
  return (
    state.questions?.find((q) => q.id === state.live.questionId) ||
    state.question
  );
}
function projected(q) {
  if (!q) return null;
  return {
    ...q,
    hint: state.live.hint && q.hintEnabled ? q.hint : undefined,
    hintMedia: state.live.hint && q.hintEnabled ? q.hintMedia : [],
    correct: state.live.reveal ? q.correct : undefined,
    answer: state.live.reveal ? q.answer : undefined,
    explanation: state.live.reveal ? q.explanation : undefined,
  };
}
function mediaHTML(q, area = "question") {
  return `<div class="media" data-media-area="${area}">${(q?.media || []).map((m) => (m.kind === "image" ? `<img src="/media/${m.file}" alt="${esc(m.name)}">` : `<${m.kind} data-area="${area}" src="/media/${m.file}" ${tv ? "" : "controls"} preload="metadata" ${m.kind === "video" ? "playsinline" : ""} aria-label="${esc(m.name)}"></${m.kind}>`)).join("")}</div>`;
}
function stage(q, l = state.live) {
  const settings = state.settings;
  let content = "";
  if (l.mode === "winner")
    content = `<div class="flourish">✦</div><p class="eyebrow">${l.winnerKind === "individual" ? esc(settings.prize) : "Khoảnh khắc vinh danh"}</p><h1>${esc(l.winner || "Xin chúc mừng!")}</h1><p class="subtitle">Cảm ơn bạn đã cùng tạo nên một ngày thật đặc biệt.</p>`;
  else if (l.mode === "score")
    content = `<p class="eyebrow">Hành trình tỏa sáng</p><h1>Bảng điểm</h1><div class="bigscore">${state.teams.map((t) => `<div><p>${esc(t.name)}</p><b class="score">${t.score}</b></div>`).join("")}</div>`;
  else if (l.mode === "welcome" || !q)
    content = `<div class="flourish">✳</div><p class="eyebrow">Chào mừng ngày Phụ nữ Việt Nam</p><h1>${esc(settings.title)}</h1><p class="subtitle">20 / 10 &nbsp; • &nbsp; Cùng chơi, cùng tỏa sáng</p>`;
  else
    content = `<p class="eyebrow">${q.category === "special" ? "✦ " + esc(settings.prize) : esc(cats[q.category])} ${l.mode === "discussion" ? " • Thảo luận & xung phong" : ""}</p><h2 class="question-title">${esc(q.title)}</h2>${mediaHTML(q)}${q.type === "choice" ? `<div class="options">${q.options.map((o, i) => `<div class="option ${q.correct === i ? "correct" : ""}"><b>${String.fromCharCode(65 + i)}</b>${esc(o)}</div>`).join("")}</div>` : ""}${q.hint !== undefined ? `<section class="hint-block"><p class="hint">✧ ${esc(q.hint)}</p>${mediaHTML({ media: q.hintMedia }, "hint")}</section>` : ""}${q.answer !== undefined ? `<p class="hint">Đáp án: ${esc(q.type === "open" ? q.answer : q.options[q.correct])}</p><p class="subtitle">${esc(q.explanation)}</p>` : ""}${l.feedback ? `<div class="feedback ${l.feedback === "incorrect" ? "bad" : ""}">${{ correct: "✓ Chính xác! Xin chúc mừng", incorrect: "Chưa chính xác • Câu hỏi vẫn tiếp tục", giveup: "Đã chuyển cơ hội trả lời", skipped: "Đã bỏ qua câu hỏi" }[l.feedback]}</div>` : ""}${q.category === "special" ? `<p class="subtitle">${esc(settings.specialRules)}</p>` : ""}`;
  return `<div class="preview ${q?.category === "special" && l.mode !== "welcome" ? "special" : ""}">${content}</div>`;
}
function render() {
  const focusedId = document.activeElement?.id;
  const preserveLiveInput =
    !tv && tab === "live" && ["winner", "liveSeconds"].includes(focusedId)
      ? { id: focusedId, value: document.activeElement.value }
      : null;
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  if (tv) {
    renderTV();
    return;
  }
  const titles = {
    live: ["Điều khiển trực tiếp", "Mọi khoảnh khắc, trong tầm tay bạn."],
    questions: [
      "Quản lý câu hỏi",
      `${state.questions.length} câu hỏi • Nội dung được lưu trên máy này`,
    ],
    scores: ["Điểm số & kết quả", "Theo dõi cuộc đua và điều chỉnh khi cần."],
    settings: [
      "Thiết lập sự kiện",
      "Linh hoạt với thể lệ và phong cách của bạn.",
    ],
    help: ["Sẵn sàng lên sóng", "Hướng dẫn nhanh cho người dẫn chương trình."],
  };
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand"><span>20/10</span><br>Minigame Studio</div>${Object.entries(
    {
      questions: "01 · Quản lý câu hỏi",
      live: "02 · Điều khiển trực tiếp",
      scores: "03 · Điểm số & kết quả",
      settings: "⚙ Thiết lập",
      help: "? Hướng dẫn",
    },
  )
    .map(([k, v]) =>
      button(v, "tab", tab === k ? "active" : "", `data-tab="${k}"`),
    )
    .join(
      "",
    )}<div class="bottom"><span class="dot"></span>Chạy cục bộ · Ngoại tuyến<br>Dữ liệu tự động lưu trên máy<br><span class="muted">Phiên bản 2.0 • Dành cho 20/10</span></div></aside><main class="main"><header class="top"><div><p class="eyebrow">Không gian tổ chức</p><h1>${titles[tab][0]}</h1><p class="muted">${titles[tab][1]}</p></div><div class="row">${button("HOÀN TÁC", "undo", "", state.undoCount ? "" : "disabled")}<a class="button" href="/audience" target="audience">↗ Mở màn hình TV</a></div></header>${draft ? editor() : { live: livePage, questions: questionsPage, scores: scoresPage, settings: settingsPage, help: helpPage }[tab]()}</main></div>`;
  if (preserveLiveInput) {
    const input = $("#" + preserveLiveInput.id);
    if (input) {
      input.value = preserveLiveInput.value;
      input.focus();
    }
  }
  updateClock();
}
function renderTV() {
  const q = state.question,
    l = state.live,
    newKey = `${q?.id}:${l.mode === "discussion" ? "question" : l.mode}`;
  const saved = {};
  document
    .querySelectorAll("video,audio")
    .forEach(
      (el) =>
        (saved[el.dataset.area + el.getAttribute("src")] = {
          el,
          wasPlaying: !el.paused,
        }),
    );
  app.innerHTML = `<main class="audience"><div class="audience-tools">${button(document.fullscreenElement ? "Thoát toàn màn hình" : "Toàn màn hình", "fullscreen", "", `aria-pressed="${Boolean(document.fullscreenElement)}"`)}${button("Bật âm thanh", "sound")}</div><div class="stage"><div class="stage-timer" data-clock></div>${stage(q)}<div class="score-strip">${state.teams.map((t, i) => `<div class="${q?.category !== "special" && l.team === i ? "current" : ""}"><span>${q?.category !== "special" && l.team === i ? "● " : ""}${esc(t.name)}</span><b>${t.score}</b></div>`).join("")}</div>${q?.category === "special" ? '<div class="individual-label">Vòng cá nhân · Không cộng điểm tổ</div>' : ""}</div></main>`;
  document.querySelectorAll("video,audio").forEach((el) => {
    const area = el.dataset.area,
      old = mediaKey === newKey ? saved[area + el.getAttribute("src")] : null;
    if (old) {
      el.replaceWith(old.el);
      el = old.el;
    }
    const playing = area === "hint" ? l.hintPlaying : l.mediaPlaying,
      epoch = area === "hint" ? l.hintEpoch : l.mediaEpoch,
      previous = area === "hint" ? lastHintEpoch : lastMediaEpoch;
    if (
      !old ||
      previous !== epoch ||
      (old.wasPlaying && playing) ||
      (!playing && !el.paused)
    ) {
      if (playing)
        el.play().catch(() =>
          toast("Bấm Bật âm thanh trên màn hình TV để cho phép phát."),
        );
      else el.pause();
    }
  });
  mediaKey = newKey;
  lastMediaEpoch = l.mediaEpoch;
  lastHintEpoch = l.hintEpoch;
  if (
    lastExpiredAt !== null &&
    l.expiredAt &&
    l.expiredAt !== lastExpiredAt &&
    state.settings.timerEnabled &&
    state.settings.warningSound
  )
    playWarning();
  lastExpiredAt = l.expiredAt;
}
function liveStatus() {
  const l = state.live;
  if (l.mode === "welcome") return "Đang hiện màn hình chào";
  if (l.mode === "winner") return "Đang vinh danh người thắng";
  if (l.mode === "score") return "Đang hiện bảng điểm";
  if (l.settled)
    return l.feedback === "skipped"
      ? "Đã bỏ câu • MC chọn câu tiếp"
      : "Đã kết thúc câu • MC chọn câu tiếp";
  if (l.mode === "discussion") return "Đang mở vòng xung phong";
  if (l.feedback === "incorrect")
    return "Trả lời sai • Câu vẫn mở, chọn tổ khác";
  return l.questionId ? "Đang nhận câu trả lời" : "Chọn câu hỏi để bắt đầu";
}
function livePage() {
  const q = qCurrent(),
    l = state.live,
    active = q && !l.settled && ["question", "discussion"].includes(l.mode),
    special = q?.category === "special";
  const selected = state.questions.some((q) => q.id === selectedQuestionId)
    ? selectedQuestionId
    : l.questionId || state.questions[0]?.id;
  const index = state.questions.findIndex((q) => q.id === l.questionId);
  return `<div class="question-picker"><select id="select-q" aria-label="Chọn câu hỏi">${state.questions.map((q, i) => `<option value="${q.id}" ${q.id === selected ? "selected" : ""}>${i + 1}. [${cats[q.category]}] ${esc(q.title)}</option>`).join("")}</select>${button("HIỆN CÂU HỎI", "show", "primary", !selected ? "disabled" : "")}${button("CÂU TRƯỚC", "previous", "", index <= 0 ? "disabled" : "")}${button("CÂU TIẾP THEO", "next", "", index >= state.questions.length - 1 ? "disabled" : "")}</div>
 <div class="live-status" role="status"><span class="dot"></span>${liveStatus()}${q ? `<span class="badge">Câu ${index + 1} · ${cats[q.category]} · ${q.type === "choice" ? "Trắc nghiệm" : "Tự luận"}</span>` : ""}</div>
 <div class="live-layout"><section class="panel live-console">
 <div class="team-selectors">${state.teams.map((t, i) => button(`<span>Tổ ${i + 1}</span><small>${t.name === `Tổ ${i + 1}` ? "&nbsp;" : esc(t.name)}</small><strong>${t.score} điểm</strong>`, "team", `team-button ${l.team === i && !special ? "active" : ""}`, `data-index="${i}" ${special || (q?.category === "tie" && !l.tieTeams.includes(i)) ? "disabled" : ""}`)).join("")}</div>
 <div class="current-team">${special ? "Cá nhân đang trả lời • Không cộng điểm tổ" : `Đang trả lời: <strong>${esc(state.teams[l.team].name)}</strong>`}</div>
 <h2 class="live-question">${esc(q?.title || "Chọn câu ở phía trên rồi bấm HIỆN CÂU HỎI.")}</h2>
 ${q?.type === "choice" ? `<div class="answer-buttons">${q.options.map((o, i) => button(`<b>${String.fromCharCode(65 + i)}</b> ${esc(o)}`, "chooseOption", `answer-button ${l.selectedOption === i ? "selected" : ""}`, `data-index="${i}" ${!active ? "disabled" : ""}`)).join("")}</div><div class="private-verdict">${l.selectedOption === null ? "Bấm phương án người chơi chọn. Chỉ Admin thấy đối chiếu đáp án." : `Chỉ Admin: ${String.fromCharCode(65 + l.selectedOption)} ${l.selectedOption === q.correct ? "khớp đáp án lưu sẵn ✓" : "không khớp đáp án lưu sẵn"}. Bạn quyết định bằng nút ĐÚNG / SAI.`}</div>` : q ? `<div class="private-verdict">Đáp án tham khảo (riêng Admin): ${esc(q.answer)}<br>Nghe câu trả lời và bấm ĐÚNG / SAI; không cần nhập lại.</div>` : ""}
 <div class="judge-buttons">${button(special ? "ĐÚNG (KHÔNG CỘNG ĐIỂM)" : "ĐÚNG (+1)", "correct", "judge correct-button", !active ? "disabled" : "")}${button("SAI (0 ĐIỂM)", "incorrect", "judge bad", !active ? "disabled" : "")}${button("CHỊU THUA / CHUYỂN TỔ", "giveup", "judge", !active ? "disabled" : "")}</div>
 <div class="row secondary-controls">${q?.hintEnabled ? button(l.hint ? "ẨN GỢI Ý" : "HIỆN GỢI Ý", "hint", "", !q ? "disabled" : "") : ""}${button(l.reveal ? "ẨN ĐÁP ÁN" : "HIỆN ĐÁP ÁN", "reveal", "", !q ? "disabled" : "")}${button("MỞ VÒNG XUNG PHONG", "volunteer", "", !active ? "disabled" : "")}${button("BỎ CÂU", "skip", "bad", !active ? "disabled" : "")}</div>
 ${l.failed.length >= 4 && !l.settled ? '<p class="notice">Bốn tổ đã thử. Bạn có thể mở vòng xung phong, hiện gợi ý hoặc bỏ câu.</p>' : ""}
 <details class="private-notes"><summary>Đáp án, giải thích và gợi ý riêng cho Admin</summary><p>Đáp án: ${esc(q?.type === "choice" ? q.options[q.correct] : q?.answer)}</p><p>${esc(q?.explanation)}</p><p>Gợi ý: ${esc(q?.hint)}</p></details>
 </section><aside class="live-side"><div class="mini-preview"><p class="eyebrow">Đang trên TV</p>${stage(projected(q))}</div><div class="panel timer-panel"><div class="row spread"><h3>Đồng hồ</h3><label class="inline"><input id="liveTimerEnabled" type="checkbox" ${state.settings.timerEnabled ? "checked" : ""}> Sử dụng</label></div>${state.settings.timerEnabled ? `<div class="row spread"><div class="timer" data-clock></div><label class="inline">Giây <input id="liveSeconds" type="number" min="5" max="3600" value="${state.settings.seconds}" aria-label="Thời gian trả lời"></label>${button("Áp dụng", "duration")}</div><div class="row">${button(l.deadline ? "Tạm dừng" : l.remaining < state.settings.seconds * 1000 && l.remaining > 0 ? "Tiếp tục" : "Bắt đầu", "timer", "primary", !active ? "disabled" : "")}${button("Đặt lại", "resetTimer")}</div>` : '<p class="muted">Đồng hồ đã tắt trên cả Admin và TV.</p>'}</div>
 <div class="panel media-controls"><h3>Trình chiếu & âm thanh</h3><div class="row">${button("Màn hình chào", "welcome")}${button("Bảng điểm", "scoreMode")}${q?.media.some((m) => m.kind !== "image") ? button(l.mediaPlaying ? "Dừng tệp câu hỏi" : "Phát tệp câu hỏi", "media") : ""}${q?.hintEnabled && q.hintMedia.some((m) => m.kind !== "image") ? button(l.hintPlaying ? "Dừng tệp gợi ý" : "Phát tệp gợi ý", "hintMedia", "", !l.hint ? "disabled" : "") : ""}</div></div>
 ${special ? `<div class="panel"><label for="winner">Tên cá nhân nhận giải đặc biệt</label><input id="winner" maxlength="200" placeholder="Nhập tên người thắng">${button("CÔNG BỐ NGƯỜI THẮNG", "winner", "primary")}</div>` : ""}
 </aside></div>`;
}
function questionsPage() {
  return `<div class="row spread toolbar"><span class="muted">${Object.keys(
    cats,
  )
    .map(
      (c) =>
        `${cats[c]}: ${state.questions.filter((q) => q.category === c).length}`,
    )
    .join(
      " · ",
    )}</span>${button("+ Thêm câu hỏi", "new", "primary")}</div><div class="notice">Các câu hỏi ban đầu là nội dung giữ chỗ. Hãy thay nội dung và kiểm tra đáp án trước sự kiện.</div><div class="question-list">${state.questions.map((q, i) => `<div class="question-row"><span class="num">${String(i + 1).padStart(2, "0")}</span><div class="text"><strong>${esc(q.title)}</strong><span class="badge">${cats[q.category]}</span> <small>${q.type === "choice" ? "Trắc nghiệm" : "Tự luận"} · ${q.media.length} tệp</small></div>${button("↑", "up", "", `data-id="${q.id}" aria-label="Chuyển lên" ${i === 0 ? "disabled" : ""}`)}${button("↓", "down", "", `data-id="${q.id}" aria-label="Chuyển xuống" ${i === state.questions.length - 1 ? "disabled" : ""}`)}${button("Sửa", "edit", "", `data-id="${q.id}"`)}${button("Nhân bản", "duplicate", "", `data-id="${q.id}"`)}${button("Xóa", "delete", "bad", `data-id="${q.id}"`)}</div>`).join("")}</div>`;
}
function editor() {
  return `<div class="panel"><div class="row spread"><h2>Biên tập câu hỏi</h2><div class="row">${button("Xem trước", "preview")}${button("Hủy", "cancel")}${button("Lưu câu hỏi", "save", "primary")}</div></div><div class="editor-grid"><section><label for="title">Nội dung câu hỏi</label><textarea id="title" maxlength="10000">${esc(draft.title)}</textarea><label for="category">Nhóm câu hỏi</label><select id="category">${Object.entries(
    cats,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${draft.category === k ? "selected" : ""}>${v}</option>`,
    )
    .join(
      "",
    )}</select><label for="type">Loại câu hỏi</label><select id="type"><option value="choice" ${draft.type === "choice" ? "selected" : ""}>Trắc nghiệm</option><option value="open" ${draft.type === "open" ? "selected" : ""}>Tự luận</option></select><div id="choices" ${draft.type === "open" ? "hidden" : ""}><label>Các phương án • tích chọn đáp án đúng</label>${draft.options.map((o, i) => `<div class="fieldrow"><input type="radio" name="correct" value="${i}" aria-label="Đáp án đúng ${i + 1}" ${draft.correct === i ? "checked" : ""}><input data-option="${i}" value="${esc(o)}" aria-label="Phương án ${i + 1}" maxlength="10000">${button("×", "removeOption", "", `data-index="${i}" aria-label="Xóa phương án ${i + 1}" ${draft.options.length <= 2 ? "disabled" : ""}`)}</div>`).join("")}${button("+ Thêm phương án", "addOption", "", draft.options.length >= 10 ? "disabled" : "")}</div><label for="answer">Đáp án tham khảo (tự luận)</label><textarea id="answer">${esc(draft.answer)}</textarea></section><section><label class="hint-toggle"><input id="hintEnabled" type="checkbox" ${draft.hintEnabled ? "checked" : ""}> Có gợi ý</label><div id="hint-fields" ${draft.hintEnabled ? "" : "hidden"}><label for="hint">Nội dung gợi ý duy nhất</label><textarea id="hint">${esc(draft.hint)}</textarea><label for="hintUpload">Ảnh, âm thanh, video cho gợi ý</label><input id="hintUpload" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mp3,.wav,.ogg,.m4a"><div class="row">${draft.hintMedia.map((m, i) => `<span class="media-chip">${esc(m.name)} ${button("×", "removeHintMedia", "", `data-index="${i}" aria-label="Gỡ tệp gợi ý"`)}</span>`).join("")}</div><p class="muted">Tắt Có gợi ý chỉ ẩn gợi ý; nội dung và tệp vẫn được giữ.</p></div><label for="explanation">Giải thích đáp án</label><textarea id="explanation">${esc(draft.explanation)}</textarea><label for="upload">Ảnh, âm thanh, video từ máy tính</label><input id="upload" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mp3,.wav,.ogg,.m4a"><p class="muted"><small>Tối đa 10 tệp/câu, 100 MB/tệp. Ưu tiên MP4 H.264, MP3, PNG/JPG để tương thích với TV. Nên giới hạn 1–2 tệp/câu để dễ đọc.</small></p><div class="row">${draft.media.map((m, i) => `<span class="media-chip">${esc(m.name)} ${button("×", "removeMedia", "", `data-index="${i}" aria-label="Gỡ tệp"`)}</span>`).join("")}</div><div class="notice">Tệp tải lên được lưu cục bộ. Sao lưu sẽ bao gồm toàn bộ nội dung và tệp đính kèm đã lưu vào câu hỏi.</div></section></div></div>`;
}
function capture() {
  if (!draft) return;
  for (const k of [
    "title",
    "category",
    "type",
    "answer",
    "hint",
    "explanation",
  ])
    draft[k] = $("#" + k).value;
  draft.options = [...document.querySelectorAll("[data-option]")].map(
    (e) => e.value,
  );
  draft.hintEnabled = $("#hintEnabled").checked;
  draft.correct = Number($("input[name=correct]:checked")?.value || 0);
}
function scoresPage() {
  const max = Math.max(...state.teams.map((t) => t.score)),
    leaders = state.teams
      .map((t, i) => ({ ...t, index: i }))
      .filter((t) => t.score === max),
    tie = state.questions.filter((q) => q.category === "tie");
  return `<div class="notice">${leaders.length > 1 ? `Đang hòa dẫn đầu: ${leaders.map((t) => esc(t.name)).join(", ")}. Chọn tổ tham gia và mở câu phân định hòa khi sẵn sàng.` : `Dẫn đầu: ${esc(leaders[0].name)} — ${max} điểm.`}</div><div class="bigscore">${state.teams.map((t, i) => `<div class="panel"><p class="eyebrow">Tổ ${i + 1}</p><div class="score">${t.score}</div><label for="teamname${i}">Tên tổ</label><input id="teamname${i}" value="${esc(t.name)}" maxlength="100"><label for="teamscore${i}">Điểm số</label><input id="teamscore${i}" type="number" min="-10000" max="10000" value="${t.score}"></div>`).join("")}</div><div class="row toolbar">${button("Lưu tên & điểm", "saveTeams", "primary")}${button("CÔNG BỐ TỔ CHIẾN THẮNG", "announceTeam", "", leaders.length !== 1 ? "disabled" : "")}${button("Hiện bảng điểm lên TV", "scoreMode")}</div>
 <div class="panel"><h2>Phân định hòa • MC chủ động mở</h2><div class="row">${state.teams.map((t, i) => `<label class="inline"><input type="checkbox" name="tieTeam" value="${i}" ${leaders.some((t) => t.index === i) ? "checked" : ""}> Tổ ${i + 1} — ${esc(t.name)}</label>`).join("")}</div><div class="question-picker"><select id="tie-question" aria-label="Câu phân định hòa">${tie.map((q, i) => `<option value="${q.id}">${i + 1}. ${esc(q.title)}${state.live.awarded.includes(q.id) ? " (đã chấm)" : ""}</option>`).join("")}</select>${button("MỞ CÂU PHÂN ĐỊNH HÒA", "tieRound", "primary", !tie.length ? "disabled" : "")}</div><p class="muted">Đúng +1 điểm. Chỉ tổ được chọn tham gia; có thể thay danh sách tại đây. Hệ thống không tự mở câu.</p></div>
 <div class="panel"><h2>Lịch sử điểm</h2>${
   state.scoreLog.length
     ? `<div class="score-history"><table><thead><tr><th>Thời gian</th><th>Tổ</th><th>Thao tác</th><th>Điểm</th></tr></thead><tbody>${state.scoreLog
         .slice()
         .reverse()
         .map(
           (e) =>
             `<tr><td>${new Date(e.at).toLocaleString("vi-VN")}</td><td>${esc(e.name)}</td><td>${esc(e.reason)}</td><td>${e.before} → <b>${e.after}</b></td></tr>`,
         )
         .join("")}</tbody></table></div>`
     : '<p class="muted">Chưa có thay đổi điểm. Các lần chấm, sửa điểm và hoàn tác sẽ xuất hiện ở đây.</p>'
 }</div>`;
}
function settingsPage() {
  const s = state.settings;
  return `<div class="editor-grid"><div class="panel"><h2>Thể lệ linh hoạt</h2><label for="seconds">Thời gian mỗi lượt (5–3600 giây)</label><input id="seconds" type="number" min="5" max="3600" value="${s.seconds}"><label><input id="autoPass" type="checkbox" ${s.autoPass ? "checked" : ""}> Tự chuyển đội khi hết giờ</label><label><input id="timerEnabled" type="checkbox" ${s.timerEnabled ? "checked" : ""}> Sử dụng đồng hồ</label><label><input id="warningSound" type="checkbox" ${s.warningSound ? "checked" : ""}> Âm báo khi hết giờ trên TV (bấm Bật âm thanh trên TV trước)</label><label for="backupPoints">Điểm câu dự phòng</label><input id="backupPoints" type="number" min="0" max="100" value="${s.backupPoints}"><p class="notice">Câu thường và phân định hòa: đúng +1. Câu đặc biệt dành cho cá nhân: không cộng điểm tổ. Vòng xung phong do MC chủ động mở.</p><label for="specialRules">Thể lệ câu đặc biệt (hiện trên TV)</label><textarea id="specialRules" maxlength="2000">${esc(s.specialRules)}</textarea></div><div class="panel"><h2>Không gian trình chiếu</h2><label for="eventTitle">Thông điệp màn hình chào</label><input id="eventTitle" maxlength="2000" value="${esc(s.title)}"><label for="prize">Tên giải thưởng đặc biệt</label><input id="prize" maxlength="2000" value="${esc(s.prize)}"><label for="accent">Màu nhấn</label><input id="accent" type="color" value="${s.accent}"><div class="notice">Sau khi đổi thời gian, bấm “Đặt lại” đồng hồ để áp dụng cho lượt đang mở.</div>${button("Lưu thiết lập", "saveSettings", "primary")}</div></div><div class="panel"><h2>Dữ liệu & sao lưu</h2><p class="muted">Lưu bản sao vào USB trước sự kiện. Giữ tổng dữ liệu dưới 140 MB để có thể khôi phục bằng tệp sao lưu (giới hạn 200 MB).</p><div class="row"><a class="button" href="/api/backup" download>Sao lưu toàn bộ</a><label style="margin:0">Khôi phục từ bản sao<input id="restore" type="file" accept=".json"></label>${button("Bắt đầu sự kiện mới", "reset", "bad")}</div><p class="muted"><small>Bắt đầu mới đặt lại điểm và tiến trình, giữ câu hỏi, tệp và thiết lập. Có thể hoàn tác.</small></p></div>`;
}
function helpPage() {
  return `<div class="panel help"><h2>Ba khu vực, một luồng dẫn đơn giản</h2><ol><li><b>Quản lý câu hỏi:</b> chuẩn bị nội dung, đáp án, ảnh/nhạc/video. Bật Có gợi ý nếu cần; tắt công tắc vẫn giữ nội dung và tệp gợi ý. Xem trước riêng không gửi lên TV.</li><li><b>Điều khiển trực tiếp:</b> chọn câu → HIỆN CÂU HỎI → chọn Tổ 1–4. Với trắc nghiệm, bấm phương án người chơi chọn để đối chiếu riêng, sau đó bấm ĐÚNG hoặc SAI. Bạn có thể chấm khác đáp án lưu sẵn.</li><li><b>Điểm số & kết quả:</b> sửa điểm, xem lịch sử, chọn các tổ tham gia câu phân định hòa, công bố tổ dẫn đầu duy nhất.</li></ol><h2>Khi đang dẫn</h2><p>ĐÚNG cộng 1 và kết thúc câu, không chuyển câu. SAI không cộng điểm, giữ câu và tổ hiện tại; chọn tổ tiếp theo khi sẵn sàng. CHỊU THUA chuyển sang tổ kế tiếp, nhưng bạn luôn có thể chọn lại tổ. Bốn tổ sai không tự mở vòng xung phong: MC chủ động bấm mở. Gợi ý không trừ điểm. Chỉ bấm HIỆN ĐÁP ÁN mới công bố đáp án.</p><p>CÂU TIẾP THEO và CÂU TRƯỚC là thao tác chủ động của MC để trình chiếu câu khác. Câu phân định hòa cần mở vòng và chọn các tổ tham gia. Câu đặc biệt dành cho cá nhân, không cộng điểm tổ; nhập tên người thắng trong bảng điều khiển.</p><p>Đồng hồ có thể tắt, đổi số giây, bắt đầu/tạm dừng/tiếp tục/đặt lại. Mặc định hết giờ không chuyển tổ hoặc kết thúc câu. Tự chuyển khi hết giờ và âm báo là tùy chọn trong Thiết lập. Hoàn tác khôi phục thao tác gần nhất và dừng đồng hồ.</p><h2>Đưa lên TV</h2><p>Kết nối HDMI → Windows + P → Mở rộng. Bấm Mở màn hình TV, kéo cửa sổ sang TV. Nút Toàn màn hình mở và thoát; Esc cũng thoát. Bấm Bật âm thanh một lần trên TV, sau đó điều khiển tệp câu hỏi/gợi ý từ Admin. TV chỉ trình chiếu, không chấm điểm hoặc điều khiển trò chơi.</p><h2>Bảo vệ nội dung</h2><p>Sao lưu toàn bộ trước sự kiện. Bản 2.0 đọc bản sao lưu 1.0 và giữ câu hỏi, tệp, điểm. Khi nâng cấp, giải nén vào thư mục mới, mở bản mới rồi khôi phục tệp sao lưu. Không xóa thư mục data của bản cũ. Không mở hai máy chủ cùng lúc.</p></div>`;
}
function updateClock() {
  if (!state) return;
  const l = state.live,
    ms =
      l.deadline === null
        ? l.remaining
        : Math.max(0, l.deadline - (Date.now() + offset));
  document.querySelectorAll("[data-clock]").forEach((e) => {
    e.textContent =
      Math.ceil(ms / 1000)
        .toString()
        .padStart(2, "0") + "s";
    e.classList.toggle("paused", l.deadline === null);
    if (tv)
      e.hidden =
        !state.settings.timerEnabled ||
        !["question", "discussion"].includes(l.mode);
  });
}
app.addEventListener("change", async (e) => {
  if (e.target.id === "select-q") {
    selectedQuestionId = e.target.value;
    return;
  }
  if (e.target.id === "liveTimerEnabled") {
    await action("settings", {
      settings: { ...state.settings, timerEnabled: e.target.checked },
    });
    return;
  }
  if (e.target.id === "type" || e.target.id === "hintEnabled") {
    capture();
    render();
  }
  if (e.target.id === "upload" || e.target.id === "hintUpload") {
    const mediaField = e.target.id === "hintUpload" ? "hintMedia" : "media";
    capture();
    busy = true;
    try {
      for (const file of e.target.files) {
        if (draft[mediaField].length >= 10)
          throw Error("Tối đa 10 tệp cho mỗi câu.");
        if (file.size > 100 * 1024 * 1024)
          throw Error("Mỗi tệp tối đa 100 MB.");
        toast("Đang lưu tệp: " + file.name);
        draft[mediaField].push(
          await request("/api/upload?name=" + encodeURIComponent(file.name), {
            method: "POST",
            body: file,
          }),
        );
      }
      render();
      toast("Đã tải tệp. Bấm Lưu câu hỏi để hoàn tất.");
    } catch (e) {
      toast(e.message);
      render();
    } finally {
      busy = false;
    }
  }
  if (e.target.id === "restore") {
    const file = e.target.files[0];
    if (
      !file ||
      !confirm(
        "Thay toàn bộ dữ liệu bằng bản sao này? Hãy sao lưu dữ liệu hiện tại trước.",
      )
    )
      return;
    try {
      if (file.size > 200 * 1024 * 1024)
        throw Error("Bản sao lưu vượt quá 200 MB.");
      await request("/api/restore", { method: "POST", body: file });
      await refresh(true);
      toast("Đã khôi phục dữ liệu.");
    } catch (e) {
      toast(e.message);
    }
  }
});
app.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    id = b.dataset.id,
    i = Number(b.dataset.index);
  if (busy) {
    toast("Đang lưu dữ liệu, vui lòng chờ.");
    return;
  }
  switch (a) {
    case "fullscreen":
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        toast("Trình duyệt chưa cho phép toàn màn hình. Có thể dùng F11.");
      }
      break;
    case "sound":
      audioContext ||= new AudioContext();
      await audioContext.resume();
      document.querySelectorAll("audio,video").forEach((el) => {
        el.muted = false;
        if (
          el.dataset.area === "hint"
            ? state.live.hintPlaying
            : state.live.mediaPlaying
        )
          el.play().catch(() =>
            toast("Không phát được tệp. Kiểm tra định dạng."),
          );
      });
      toast("Đã bật âm thanh. MC điều khiển phát/dừng từ Admin.");
      break;
    case "tab":
      if (draft && !confirm("Bỏ các thay đổi chưa lưu?")) return;
      draft = null;
      tab = b.dataset.tab;
      render();
      break;
    case "show":
      await showQuestion($("#select-q").value);
      break;
    case "welcome":
      await action("mode", { mode: "welcome" });
      break;
    case "scoreMode":
      await action("mode", { mode: "score" });
      break;
    case "team":
      await action("team", { index: i });
      break;
    case "winner": {
      const name = $("#winner").value.trim();
      if (!name) return toast("Hãy nhập tên người hoặc đội nhận giải.");
      await action("winner", { name, kind: "individual" });
      break;
    }
    case "new":
      draft = {
        id: crypto.randomUUID(),
        category: "mv",
        title: "",
        type: "choice",
        options: ["", "", "", ""],
        correct: 0,
        answer: "",
        hint: "",
        hintEnabled: false,
        hintMedia: [],
        explanation: "",
        media: [],
      };
      render();
      break;
    case "edit":
      draft = structuredClone(state.questions.find((q) => q.id === id));
      render();
      break;
    case "cancel":
      if (confirm("Bỏ các thay đổi chưa lưu?")) {
        draft = null;
        render();
      }
      break;
    case "save":
      capture();
      if (!draft.title.trim()) return toast("Hãy nhập nội dung câu hỏi.");
      if (draft.type === "choice" && draft.options.some((x) => !x.trim()))
        return toast("Hãy nhập đủ các phương án.");
      await action("saveQuestion", { question: draft });
      if (
        state.questions.some((q) => JSON.stringify(q) === JSON.stringify(draft))
      ) {
        draft = null;
        render();
        toast("Đã lưu câu hỏi.");
      }
      break;
    case "addOption":
      capture();
      draft.options.push("");
      render();
      break;
    case "removeOption":
      capture();
      draft.options.splice(i, 1);
      if (draft.correct === i) draft.correct = 0;
      else if (draft.correct > i) draft.correct--;
      render();
      break;
    case "removeHintMedia":
      capture();
      draft.hintMedia.splice(i, 1);
      render();
      break;
    case "removeMedia":
      capture();
      draft.media.splice(i, 1);
      render();
      break;
    case "preview": {
      capture();
      const d = document.createElement("dialog");
      d.innerHTML = `<div class="row spread"><h2>Xem trước riêng • Không gửi lên TV</h2><button id="close-preview">Đóng</button></div>${stage({ ...draft, correct: undefined, hint: undefined, hintMedia: [], answer: undefined, explanation: undefined }, { mode: "question", feedback: "" })}`;
      document.body.append(d);
      d.showModal();
      d.querySelector("button").onclick = () => d.close();
      d.onclose = () => d.remove();
      break;
    }
    case "delete":
      if (confirm("Xóa câu hỏi này? Có thể hoàn tác."))
        await action("delete", { id });
      break;
    case "duplicate":
      await action("duplicate", { id });
      break;
    case "up":
    case "down":
      await action("move", { id, delta: a === "up" ? -1 : 1 });
      break;
    case "saveTeams":
      await action("teams", {
        teams: state.teams.map((t, i) => ({
          name: $("#teamname" + i).value.trim() || `Tổ ${i + 1}`,
          score: Number($("#teamscore" + i).value),
        })),
      });
      break;
    case "saveSettings":
      await action("settings", {
        settings: {
          seconds: Number($("#seconds").value),
          autoPass: $("#autoPass").checked,
          discussion: false,
          timerEnabled: $("#timerEnabled").checked,
          warningSound: $("#warningSound").checked,
          backupPoints: Number($("#backupPoints").value),
          tiePoints: 1,
          title: $("#eventTitle").value,
          prize: $("#prize").value,
          accent: $("#accent").value,
          specialRules: $("#specialRules").value,
        },
      });
      break;
    case "chooseOption":
      await action("chooseOption", { index: i });
      break;
    case "previous":
    case "next": {
      const index = state.questions.findIndex(
          (q) => q.id === state.live.questionId,
        ),
        q = state.questions[index + (a === "next" ? 1 : -1)];
      if (q) await showQuestion(q.id);
      break;
    }
    case "tieRound": {
      const teams = [
        ...document.querySelectorAll("input[name=tieTeam]:checked"),
      ].map((e) => Number(e.value));
      if (teams.length < 2) return toast("Chọn ít nhất hai tổ tham gia.");
      if (
        !confirm(
          "Mở câu phân định hòa cho các tổ đã chọn và trình chiếu lên TV?",
        )
      )
        return;
      await action("tieRound", { teams, id: $("#tie-question").value });
      tab = "live";
      selectedQuestionId = state.live.questionId;
      render();
      break;
    }
    case "announceTeam": {
      const max = Math.max(...state.teams.map((t) => t.score)),
        winners = state.teams.filter((t) => t.score === max);
      if (winners.length !== 1)
        return toast("Đang hòa điểm. Hãy mở câu phân định hòa.");
      if (confirm(`Công bố ${winners[0].name} chiến thắng với ${max} điểm?`))
        await action("winner", { name: winners[0].name, kind: "team" });
      break;
    }
    case "duration":
      if (
        await action("settings", {
          settings: {
            ...state.settings,
            seconds: Number($("#liveSeconds").value),
          },
        })
      )
        await action("resetTimer");
      break;
    case "skip":
      if (confirm("Bỏ câu hiện tại mà không cộng điểm?")) await action("skip");
      break;
    case "reset":
      if (confirm("Đặt lại tất cả điểm và tiến trình cho sự kiện mới?"))
        await action("reset");
      break;
    default:
      await action(a);
  }
});
async function showQuestion(id) {
  const q = state.questions.find((q) => q.id === id);
  if (q?.category === "tie" && !state.live.tieActive) {
    tab = "scores";
    render();
    $("#tie-question").value = id;
    toast("Chọn các tổ tham gia rồi bấm MỞ CÂU PHÂN ĐỊNH HÒA.");
    return;
  }
  selectedQuestionId = id;
  await action("select", { id });
}
function playWarning() {
  if (!audioContext || audioContext.state !== "running") return;
  const osc = audioContext.createOscillator(),
    gain = audioContext.createGain();
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.12, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
  osc.connect(gain).connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.6);
}
document.addEventListener("fullscreenchange", () => {
  const b = $("[data-action=fullscreen]");
  if (b) {
    b.textContent = document.fullscreenElement
      ? "Thoát toàn màn hình"
      : "Toàn màn hình";
    b.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.fullscreenElement)
    document.exitFullscreen().catch(() => {});
});
window.addEventListener("beforeunload", (e) => {
  if (draft) {
    e.preventDefault();
    e.returnValue = "";
  }
});
await refresh();
setInterval(refresh, 500);
setInterval(updateClock, 100);
