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
  toastTimer;
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
  } catch (e) {
    toast(e.message);
    await refresh(true);
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
    hint: state.live.hint ? q.hint : undefined,
    correct: state.live.reveal ? q.correct : undefined,
    answer: state.live.reveal ? q.answer : undefined,
    explanation: state.live.reveal ? q.explanation : undefined,
  };
}
function mediaHTML(q) {
  return `<div class="media">${(q?.media || []).map((m) => (m.kind === "image" ? `<img src="/media/${m.file}" alt="${esc(m.name)}">` : `<${m.kind} src="/media/${m.file}" controls preload="metadata" ${m.kind === "video" ? "playsinline" : ""} aria-label="${esc(m.name)}"></${m.kind}>`)).join("")}</div>`;
}
function stage(q, l = state.live) {
  const settings = state.settings;
  let content = "";
  if (l.mode === "winner")
    content = `<div class="flourish">✦</div><p class="eyebrow">${q?.category === "special" ? esc(settings.prize) : "Khoảnh khắc vinh danh"}</p><h1>${esc(l.winner || "Xin chúc mừng!")}</h1><p class="subtitle">Cảm ơn bạn đã cùng tạo nên một ngày thật đặc biệt.</p>`;
  else if (l.mode === "score")
    content = `<p class="eyebrow">Hành trình tỏa sáng</p><h1>Bảng điểm</h1><div class="bigscore">${state.teams.map((t) => `<div><p>${esc(t.name)}</p><b class="score">${t.score}</b></div>`).join("")}</div>`;
  else if (l.mode === "welcome" || !q)
    content = `<div class="flourish">✳</div><p class="eyebrow">Chào mừng ngày Phụ nữ Việt Nam</p><h1>${esc(settings.title)}</h1><p class="subtitle">20 / 10 &nbsp; • &nbsp; Cùng chơi, cùng tỏa sáng</p>`;
  else
    content = `<p class="eyebrow">${q.category === "special" ? "✦ " + esc(settings.prize) : esc(cats[q.category])} ${l.mode === "discussion" ? " • Thảo luận & xung phong" : ""}</p><h2 class="question-title">${esc(q.title)}</h2>${mediaHTML(q)}${q.type === "choice" ? `<div class="options">${q.options.map((o, i) => `<div class="option ${q.correct === i ? "correct" : ""}"><b>${String.fromCharCode(65 + i)}</b>${esc(o)}</div>`).join("")}</div>` : ""}${q.hint !== undefined ? `<p class="hint">✧ ${esc(q.hint || "Chưa có gợi ý.")}</p>` : ""}${q.answer !== undefined ? `<p class="hint">Đáp án: ${esc(q.type === "open" ? q.answer : q.options[q.correct])}</p><p class="subtitle">${esc(q.explanation)}</p>` : ""}${l.feedback ? `<div class="feedback ${l.feedback === "incorrect" ? "bad" : ""}">${{ correct: "✓ Chính xác! Xin chúc mừng", incorrect: "Chuyển cơ hội cho đội tiếp theo", skipped: "Đã bỏ qua câu hỏi" }[l.feedback]}</div>` : ""}${q.category === "special" ? `<p class="subtitle">${esc(settings.specialRules)}</p>` : ""}`;
  return `<div class="preview ${q?.category === "special" && l.mode !== "welcome" ? "special" : ""}">${content}</div>`;
}
function render() {
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  if (tv) {
    renderTV();
    return;
  }
  const titles = {
    live: ["Điều khiển trực tiếp", "Mọi khoảnh khắc, trong tầm tay bạn."],
    questions: [
      "Thư viện câu hỏi",
      `${state.questions.length} câu hỏi • Nội dung được lưu trên máy này`,
    ],
    scores: ["Đội chơi & điểm số", "Theo dõi cuộc đua và điều chỉnh khi cần."],
    settings: [
      "Thiết lập sự kiện",
      "Linh hoạt với thể lệ và phong cách của bạn.",
    ],
    help: ["Sẵn sàng lên sóng", "Hướng dẫn nhanh cho người dẫn chương trình."],
  };
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand"><span>20/10</span><br>Minigame Studio</div>${Object.entries(
    {
      live: "◉ Điều khiển",
      questions: "▤ Câu hỏi",
      scores: "◇ Đội & điểm",
      settings: "⚙ Thiết lập",
      help: "? Hướng dẫn",
    },
  )
    .map(([k, v]) =>
      button(v, "tab", tab === k ? "active" : "", `data-tab="${k}"`),
    )
    .join(
      "",
    )}<div class="bottom"><span class="dot"></span>Chạy cục bộ · Ngoại tuyến<br>Dữ liệu tự động lưu trên máy<br><span class="muted">Phiên bản 1.0 • Dành cho 20/10</span></div></aside><main class="main"><header class="top"><div><p class="eyebrow">Không gian tổ chức</p><h1>${titles[tab][0]}</h1><p class="muted">${titles[tab][1]}</p></div><div class="row">${button("↶ Hoàn tác", "undo", "", state.undoCount ? "" : "disabled")}<a class="button" href="/audience" target="audience">↗ Mở màn hình TV</a></div></header>${draft ? editor() : { live: livePage, questions: questionsPage, scores: scoresPage, settings: settingsPage, help: helpPage }[tab]()}</main></div>`;
  updateClock();
}
function renderTV() {
  const q = state.question,
    l = state.live,
    newKey = `${q?.id}:${l.mode}:${(q?.media || []).map((m) => m.file).join()}`;
  const saved = {};
  document
    .querySelectorAll("video,audio")
    .forEach((el) => (saved[el.getAttribute("src")] = el));
  app.innerHTML = `<main class="audience"><div class="audience-tools">${button("⛶ Toàn màn hình", "fullscreen")}${button("Bật âm thanh", "sound")}</div><div class="stage"><div class="stage-timer" data-clock></div>${stage(q)}<div class="score-strip">${state.teams.map((t, i) => `<div class="${l.team === i ? "current" : ""}"><span>${l.team === i ? "● " : ""}${esc(t.name)}</span><b>${t.score}</b></div>`).join("")}</div></main>`;
  document.querySelectorAll("video,audio").forEach((el) => {
    const old = mediaKey === newKey ? saved[el.getAttribute("src")] : null;
    if (old) {
      el.replaceWith(old);
      el = old;
    }
    if (!old || lastMediaEpoch !== l.mediaEpoch) {
      if (l.mediaPlaying)
        el.play().catch(() =>
          toast("Bấm “Bật âm thanh” trên màn hình TV để cho phép phát."),
        );
      else el.pause();
    }
  });
  mediaKey = newKey;
  lastMediaEpoch = l.mediaEpoch;
}
function livePage() {
  const q = qCurrent();
  return `<div class="grid"><section><div class="row spread toolbar"><span class="eyebrow">Xem trước • Nội dung khán giả thấy</span><span class="badge">${state.live.mode === "welcome" ? "Chờ bắt đầu" : state.live.mode === "discussion" ? "Vòng xung phong" : "Đang trình chiếu"}</span></div>${stage(projected(q))}<div class="panel" style="margin-top:18px"><div class="row spread"><div><label for="select-q">Chọn câu hỏi để trình chiếu</label><select id="select-q">${state.questions.map((q, i) => `<option value="${q.id}" ${q.id === state.live.questionId ? "selected" : ""}>${i + 1}. [${cats[q.category]}] ${esc(q.title)}</option>`).join("")}</select></div>${button("Trình chiếu câu đã chọn", "show", "primary", !state.questions.length ? "disabled" : "")}</div><div class="row" style="margin-top:16px">${button("Màn hình chào", "welcome")}${button("Bảng điểm", "scoreMode")}${button("Bỏ qua", "skip", "", !q ? "disabled" : "")}${button("Câu tiếp →", "next", "", state.questions.at(-1)?.id === q?.id ? "disabled" : "")}</div></div>${q ? `<details class="panel"><summary>Thông tin riêng cho quản trị viên</summary><p style="margin-top:15px">Đáp án: <strong>${esc(q.type === "choice" ? q.options[q.correct] : q.answer)}</strong></p><p>${esc(q.explanation)}</p><p class="muted">Gợi ý: ${esc(q.hint)}</p></details>` : ""}</section><aside><div class="panel"><div class="row spread"><h3>Đồng hồ trả lời</h3><span class="badge">${state.settings.autoPass ? "Tự chuyển lượt" : "MC quyết định"}</span></div><div class="timer" data-clock></div><div class="row">${button(state.live.deadline ? "Ⅱ Tạm dừng" : "▶ Bắt đầu", "timer", "primary", !q ? "disabled" : "")}${button("↺ Đặt lại", "resetTimer")}</div></div><div class="panel"><h3>Điều khiển câu hỏi</h3><div class="controls">${button("✓ Trả lời đúng", "correct", "good", !q || state.live.settled ? "disabled" : "")}${button("✕ Sai / chuyển lượt", "pass", "bad", !q || state.live.settled ? "disabled" : "")}${button(state.live.hint ? "Ẩn gợi ý" : "✧ Hiện gợi ý", "hint", "", !q ? "disabled" : "")}${button(state.live.reveal ? "Ẩn đáp án" : "Hiện đáp án", "reveal", "", !q ? "disabled" : "")}${button(state.live.mediaPlaying ? "Dừng âm thanh / video" : "Phát âm thanh / video", "media", "", !q?.media.length ? "disabled" : "")}</div>${state.live.mode === "discussion" ? '<p class="notice">Bốn đội đã thử. Mời xung phong, chọn đội bên dưới rồi chấm đáp án.</p>' : ""}${q?.category === "special" ? '<p class="notice">Câu đặc biệt không cộng điểm. Công bố người thắng ở bên dưới.</p>' : ""}</div><div class="panel"><h3>Đội đang trả lời <span class="muted">• bấm để chọn</span></h3>${state.teams.map((t, i) => `<button class="team-card ${i === state.live.team ? "current" : ""}" style="width:100%" data-action="team" data-index="${i}"><span>${esc(t.name)}</span><b class="score">${t.score}</b></button>`).join("")}</div><div class="panel"><label for="winner">Người / đội được vinh danh</label><input id="winner" placeholder="Nhập tên người nhận giải" maxlength="200">${button("✦ Công bố người thắng", "winner", "primary", 'style="margin-top:12px"')}</div></aside></div>`;
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
    )}</select><label for="type">Loại câu hỏi</label><select id="type"><option value="choice" ${draft.type === "choice" ? "selected" : ""}>Trắc nghiệm</option><option value="open" ${draft.type === "open" ? "selected" : ""}>Tự luận</option></select><div id="choices" ${draft.type === "open" ? "hidden" : ""}><label>Các phương án • tích chọn đáp án đúng</label>${draft.options.map((o, i) => `<div class="fieldrow"><input type="radio" name="correct" value="${i}" aria-label="Đáp án đúng ${i + 1}" ${draft.correct === i ? "checked" : ""}><input data-option="${i}" value="${esc(o)}" aria-label="Phương án ${i + 1}" maxlength="10000">${button("×", "removeOption", "", `data-index="${i}" aria-label="Xóa phương án ${i + 1}" ${draft.options.length <= 2 ? "disabled" : ""}`)}</div>`).join("")}${button("+ Thêm phương án", "addOption", "", draft.options.length >= 10 ? "disabled" : "")}</div><label for="answer">Đáp án tham khảo (tự luận)</label><textarea id="answer">${esc(draft.answer)}</textarea></section><section><label for="hint">Gợi ý</label><textarea id="hint">${esc(draft.hint)}</textarea><label for="explanation">Giải thích đáp án</label><textarea id="explanation">${esc(draft.explanation)}</textarea><label for="upload">Ảnh, âm thanh, video từ máy tính</label><input id="upload" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mp3,.wav,.ogg,.m4a"><p class="muted"><small>Tối đa 10 tệp/câu, 100 MB/tệp. Ưu tiên MP4 H.264, MP3, PNG/JPG để tương thích với TV. Nên giới hạn 1–2 tệp/câu để dễ đọc.</small></p><div class="row">${draft.media.map((m, i) => `<span class="media-chip">${esc(m.name)} ${button("×", "removeMedia", "", `data-index="${i}" aria-label="Gỡ tệp"`)}</span>`).join("")}</div><div class="notice">Tệp tải lên được lưu cục bộ. Sao lưu sẽ bao gồm toàn bộ nội dung và tệp đính kèm đã lưu vào câu hỏi.</div></section></div></div>`;
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
  draft.correct = Number($("input[name=correct]:checked")?.value || 0);
}
function scoresPage() {
  const max = Math.max(...state.teams.map((t) => t.score)),
    leaders = state.teams.filter((t) => t.score === max);
  return `<div class="notice">${leaders.length > 1 ? `Đang hòa ở vị trí dẫn đầu: ${leaders.map((t) => esc(t.name)).join(", ")}. Có thể chọn câu phân định hòa trong bảng điều khiển.` : `Dẫn đầu: ${esc(leaders[0].name)}.`}</div><div class="bigscore">${state.teams.map((t, i) => `<div class="panel"><p class="eyebrow">Đội ${i + 1}</p><div class="score">${t.score}</div><label for="teamname${i}">Tên đội</label><input id="teamname${i}" value="${esc(t.name)}" maxlength="100"><label for="teamscore${i}">Điểm số</label><input id="teamscore${i}" type="number" min="-10000" max="10000" value="${t.score}"></div>`).join("")}</div>${button("Lưu tên & điểm", "saveTeams", "primary")}<p class="muted" style="margin-top:20px">Câu thường: đúng +1, sai +0. Câu đặc biệt: không cộng điểm. Có thể hoàn tác chỉnh sửa.</p>`;
}
function settingsPage() {
  const s = state.settings;
  return `<div class="editor-grid"><div class="panel"><h2>Thể lệ linh hoạt</h2><label for="seconds">Thời gian mỗi lượt (5–3600 giây)</label><input id="seconds" type="number" min="5" max="3600" value="${s.seconds}"><label><input id="autoPass" type="checkbox" ${s.autoPass ? "checked" : ""}> Tự chuyển đội khi hết giờ</label><label><input id="discussion" type="checkbox" ${s.discussion ? "checked" : ""}> Mở vòng thảo luận sau khi 4 đội trả lời sai</label><label for="backupPoints">Điểm câu dự phòng</label><input id="backupPoints" type="number" min="0" max="100" value="${s.backupPoints}"><label for="tiePoints">Điểm câu phân định hòa</label><input id="tiePoints" type="number" min="0" max="100" value="${s.tiePoints}"><label for="specialRules">Thể lệ câu đặc biệt (hiện trên TV)</label><textarea id="specialRules" maxlength="2000">${esc(s.specialRules)}</textarea></div><div class="panel"><h2>Không gian trình chiếu</h2><label for="eventTitle">Thông điệp màn hình chào</label><input id="eventTitle" maxlength="2000" value="${esc(s.title)}"><label for="prize">Tên giải thưởng đặc biệt</label><input id="prize" maxlength="2000" value="${esc(s.prize)}"><label for="accent">Màu nhấn</label><input id="accent" type="color" value="${s.accent}"><div class="notice">Sau khi đổi thời gian, bấm “Đặt lại” đồng hồ để áp dụng cho lượt đang mở.</div>${button("Lưu thiết lập", "saveSettings", "primary")}</div></div><div class="panel"><h2>Dữ liệu & sao lưu</h2><p class="muted">Lưu bản sao vào USB trước sự kiện. Giữ tổng dữ liệu dưới 140 MB để có thể khôi phục bằng tệp sao lưu (giới hạn 200 MB).</p><div class="row"><a class="button" href="/api/backup" download>Sao lưu toàn bộ</a><label style="margin:0">Khôi phục từ bản sao<input id="restore" type="file" accept=".json"></label>${button("Bắt đầu sự kiện mới", "reset", "bad")}</div><p class="muted"><small>Bắt đầu mới đặt lại điểm và tiến trình, giữ câu hỏi, tệp và thiết lập. Có thể hoàn tác.</small></p></div>`;
}
function helpPage() {
  return `<div class="panel help"><h2>5 bước để bắt đầu</h2><ol><li><b>Chuẩn bị nội dung.</b> Vào Câu hỏi → Sửa. Thay toàn bộ câu giữ chỗ, chọn đáp án và tải ảnh/nhạc/video.</li><li><b>Đặt tên đội và thể lệ.</b> Vào Đội & điểm, sau đó Thiết lập. Bản mặc định có 8 câu MV, 4 câu khác, 1 siêu khó, 3 dự phòng, 5 phân định hòa.</li><li><b>Kết nối TV.</b> Nhấn Windows + P → Mở rộng (Extend). Bấm Mở màn hình TV, kéo cửa sổ sang TV và chọn Toàn màn hình. Bấm Bật âm thanh một lần; chọn thiết bị âm thanh HDMI trong Windows nếu dùng loa TV. Chỉ mở một màn hình TV để tránh âm thanh bị lặp.</li><li><b>Dẫn trò chơi.</b> Chọn câu → Trình chiếu → Bắt đầu. Bấm đúng/sai để chấm; bấm tên đội để chọn người xung phong. Sau khi đúng, câu kế tiếp bắt đầu từ đội tiếp theo. Đáp án và gợi ý chỉ xuất hiện khi bạn bấm công bố.</li><li><b>Sao lưu.</b> Vào Thiết lập → Sao lưu toàn bộ. Tệp chứa cả nội dung, điểm và đa phương tiện. Khi khôi phục, dữ liệu hiện tại sẽ được thay thế.</li></ol><h2>Lưu ý khi dẫn</h2><p>Hoàn tác khôi phục thao tác gần nhất, đồng hồ được tạm dừng. Mỗi câu chỉ tự cộng điểm một lần; muốn chấm lại, hãy hoàn tác hoặc chỉnh điểm thủ công. Câu đã bỏ qua không chấm điểm cho đến khi chọn lại câu đó.</p><p>Đồng hồ không tự chấm sai khi hết giờ trừ khi bật tự chuyển đội. MC chủ động chọn câu dự phòng/phân định hòa; câu siêu khó được đặt ngay sau 12 câu thường. Công bố người thắng bằng ô tên trong bảng điều khiển.</p><p>Màn hình TV đồng bộ khoảng nửa giây. Khi khởi động lại máy chủ, đồng hồ tạm dừng; các điểm và tiến trình được giữ. Không đóng cửa sổ khởi động trong sự kiện. Chỉ dùng một cửa sổ quản trị. Nội dung sửa khi đang chiếu sẽ cập nhật lên TV sau khi lưu.</p><p>Kiểm tra video, âm thanh, độ dài nội dung và độ rõ chữ trên TV thật trước sự kiện. Tắt chế độ ngủ và thông báo Windows. Đáp án không được đưa lên màn hình TV trước khi công bố; ứng dụng không dùng tài khoản/mật khẩu và chỉ dành cho máy laptop tin cậy của MC.</p></div>`;
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
    if (tv) e.hidden = !["question", "discussion"].includes(l.mode);
  });
}
app.addEventListener("change", async (e) => {
  if (e.target.id === "type") {
    capture();
    render();
  }
  if (e.target.id === "upload") {
    capture();
    busy = true;
    try {
      for (const file of e.target.files) {
        if (draft.media.length >= 10) throw Error("Tối đa 10 tệp cho mỗi câu.");
        if (file.size > 100 * 1024 * 1024)
          throw Error("Mỗi tệp tối đa 100 MB.");
        toast("Đang lưu tệp: " + file.name);
        draft.media.push(
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
      document.documentElement
        .requestFullscreen?.()
        .catch(() => toast("Có thể dùng phím F11 để toàn màn hình."));
      break;
    case "sound":
      document.querySelectorAll("audio,video").forEach((el) => {
        el.muted = false;
        if (state.live.mediaPlaying)
          el.play().catch(() =>
            toast("Không phát được tệp. Kiểm tra định dạng."),
          );
      });
      toast("Đã cho phép âm thanh. Có thể bấm phát trực tiếp trên video.");
      break;
    case "tab":
      if (draft && !confirm("Bỏ các thay đổi chưa lưu?")) return;
      draft = null;
      tab = b.dataset.tab;
      render();
      break;
    case "show":
      await action("select", { id: $("#select-q").value });
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
      await action("winner", { name });
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
    case "removeMedia":
      capture();
      draft.media.splice(i, 1);
      render();
      break;
    case "preview": {
      capture();
      const d = document.createElement("dialog");
      d.innerHTML = `<div class="row spread"><h2>Xem trước riêng • Không gửi lên TV</h2><button id="close-preview">Đóng</button></div>${stage({ ...draft, correct: undefined, hint: undefined, answer: undefined, explanation: undefined }, { mode: "question", feedback: "" })}`;
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
          name: $("#teamname" + i).value.trim() || `Đội ${i + 1}`,
          score: Number($("#teamscore" + i).value),
        })),
      });
      break;
    case "saveSettings":
      await action("settings", {
        settings: {
          seconds: Number($("#seconds").value),
          autoPass: $("#autoPass").checked,
          discussion: $("#discussion").checked,
          backupPoints: Number($("#backupPoints").value),
          tiePoints: Number($("#tiePoints").value),
          title: $("#eventTitle").value,
          prize: $("#prize").value,
          accent: $("#accent").value,
          specialRules: $("#specialRules").value,
        },
      });
      break;
    case "reset":
      if (confirm("Đặt lại tất cả điểm và tiến trình cho sự kiện mới?"))
        await action("reset");
      break;
    default:
      await action(a);
  }
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
