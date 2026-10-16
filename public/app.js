const $ = (s) => document.querySelector(s),
  app = $("#app"),
  tv = location.pathname === "/audience",
  previewOnly = tv && new URLSearchParams(location.search).has("preview");
const cats = {
  mv: "Trong MV",
  other: "Chủ đề khác",
  backup: "Dự phòng",
  special: "Siêu khó",
  video: "Video đặc biệt",
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
      (tv || (!draft && (force || !app.firstChild || tab !== "settings")))
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
    state.question ||
    state.questions?.[0]
  );
}
function mediaHTML(q, area = "question") {
  return `<div class="media" data-media-area="${area}">${(q?.media || []).map((m) => (m.kind === "image" ? `<img src="/media/${m.file}" alt="${esc(m.name)}">` : `<${m.kind} data-area="${area}" src="/media/${m.file}" ${tv ? "" : "controls"} preload="metadata" ${m.kind === "video" ? "playsinline" : ""} aria-label="${esc(m.name)}"></${m.kind}>`)).join("")}</div>`;
}
function stage(q, l = state.live) {
  const settings = state.settings;
  if (l.mode === "video")
    return `<div class="closing-video">${q?.media?.length ? mediaHTML(q) : "<p>Chưa có video. Hãy tải tệp MP4 trong Quản lý câu hỏi.</p>"}</div>`;
  let content = "";
  if (l.mode === "winner")
    content = `<div class="flourish">✦</div><p class="eyebrow">${l.winnerKind === "individual" ? esc(settings.prize) : "Khoảnh khắc vinh danh"}</p><h1>${esc(l.winner || "Xin chúc mừng!")}</h1><p class="subtitle">Cảm ơn bạn đã cùng tạo nên một ngày thật đặc biệt.</p>`;
  else if (l.mode === "score")
    content = `<p class="eyebrow">Hành trình tỏa sáng</p><h1>Bảng điểm</h1><div class="bigscore">${state.teams.map((t) => `<div><p>${esc(t.name)}</p><b class="score">${t.score}</b></div>`).join("")}</div>`;
  else if (l.mode === "waiting")
    content = `<div class="flourish">✦</div><p class="eyebrow">Câu ${q?.number || ""} · ${esc(cats[q?.category])}</p><h1>Chuẩn bị...</h1><p class="subtitle">Cơ hội tiếp theo đang chờ bạn!</p>`;
  else if (l.mode === "welcome" || !q)
    content = `<div class="flourish">✳</div><p class="eyebrow">Chào mừng ngày Phụ nữ Việt Nam</p><h1>${esc(settings.title)}</h1><p class="subtitle">20 / 10 &nbsp; • &nbsp; Cùng chơi, cùng tỏa sáng</p>`;
  else
    content = `<p class="eyebrow">${q.category === "special" ? "✦ " + esc(settings.prize) : esc(cats[q.category])} ${l.freeForAll ? " • ⚡ Tự do giành quyền trả lời!" : ""}</p><h2 class="question-title">${esc(q.title)}</h2>${mediaHTML(q)}${q.type === "choice" ? `<div class="options">${q.options.map((o, i) => `<div class="option ${l.reveal && q.correct === i ? "correct" : ""}"><b>${String.fromCharCode(65 + i)}</b>${esc(o)}</div>`).join("")}</div>` : ""}${q.hint !== undefined ? `<section class="hint-block"><p class="hint">✧ ${esc(q.hint)}</p>${mediaHTML({ media: q.hintMedia }, "hint")}</section>` : ""}${l.reveal && q.answer !== undefined ? `<p class="hint">Đáp án: ${esc(q.type === "open" ? q.answer : q.options[q.correct])}</p><p class="subtitle">${esc(q.explanation)}</p>` : ""}${l.feedback ? `<div class="feedback ${l.feedback === "incorrect" ? "bad" : ""}">${{ correct: "✓ Chính xác! Xin chúc mừng", incorrect: l.settled ? "Sai rồi!" : "Chưa chính xác!", revealed: "Đã công bố đáp án", giveup: "Đã chuyển cơ hội trả lời", skipped: "Đã bỏ qua câu hỏi" }[l.feedback]}</div>` : ""}${q.category === "special" ? `<p class="subtitle">${esc(settings.specialRules)}</p>` : ""}`;
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
      settings: "⚙ Thiết lập",
      help: "? Hướng dẫn",
    },
  )
    .map(([k, v]) =>
      button(v, "tab", tab === k ? "active" : "", `data-tab="${k}"`),
    )
    .join(
      "",
    )}<div class="bottom"><span class="dot"></span>Chạy cục bộ · Ngoại tuyến<br>Dữ liệu tự động lưu trên máy<br><span class="muted">Phiên bản 2.1.1 • Dành cho 20/10</span></div></aside><main class="main"><header class="top"><div><p class="eyebrow">Không gian tổ chức</p><h1>${titles[tab][0]}</h1><p class="muted">${titles[tab][1]}</p></div><div class="row">${button("HOÀN TÁC", "undo", "", state.undoCount ? "" : "disabled")}<a class="button" href="/audience" target="audience">↗ Mở màn hình TV</a></div></header>${draft ? editor() : { live: livePage, questions: questionsPage, settings: settingsPage, help: helpPage }[tab]()}</main></div>`;
  if (preserveLiveInput) {
    const input = $("#" + preserveLiveInput.id);
    if (input) {
      input.value = preserveLiveInput.value;
      input.focus();
    }
  }
  mountTVPreview();
  updateClock();
}
function renderTV() {
  const q = state.question,
    l = state.live,
    newKey = `${q?.id}:${l.mode === "discussion" ? "question" : l.mode}`;
  const saved = {};
  document.querySelectorAll("video,audio").forEach(
    (el) =>
      (saved[el.dataset.area + el.getAttribute("src")] = {
        el,
        wasPlaying: !el.paused,
      }),
  );
  app.innerHTML = `<main class="audience ${l.mode === "video" ? "video-mode" : ""}"><div class="audience-tools" ${previewOnly ? "hidden" : ""}>${button(document.fullscreenElement ? "Thoát toàn màn hình" : "Toàn màn hình", "fullscreen", "", `aria-pressed="${Boolean(document.fullscreenElement)}"`)}${button("Bật âm thanh", "sound")}</div>${l.mode === "video" ? stage(q) : `<div class="stage"><div class="stage-timer" data-clock></div>${stage(q)}<div class="score-strip">${state.teams.map((t, i) => `<div class="${q?.category !== "special" && l.team === i ? "current" : ""}"><span>${q?.category !== "special" && l.team === i ? "● " : ""}${esc(t.name)}</span><b>${t.score}</b></div>`).join("")}</div>${q?.category === "special" ? '<div class="individual-label">Vòng cá nhân · Không cộng điểm tổ</div>' : ""}</div>`}</main>`;
  document.querySelectorAll("video,audio").forEach((el) => {
    const area = el.dataset.area,
      old = mediaKey === newKey ? saved[area + el.getAttribute("src")] : null;
    if (old) {
      el.replaceWith(old.el);
      el = old.el;
    }
    if (l.mode === "video") {
      el.muted = previewOnly || l.videoMuted;
      el.volume = l.videoVolume;
      if (!old || lastMediaEpoch !== l.mediaEpoch) {
        const seek = () => {
          const target =
            l.videoPosition +
            (l.videoStartedAt === null
              ? 0
              : Math.max(0, Date.now() + offset - l.videoStartedAt) / 1000);
          el.currentTime = Number.isFinite(el.duration)
            ? Math.min(target, el.duration)
            : target;
        };
        if (el.readyState >= 1) seek();
        else el.addEventListener("loadedmetadata", seek, { once: true });
      }
    } else if (previewOnly) el.muted = true;
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
    !previewOnly &&
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
  if (l.mode === "waiting")
    return "Chuẩn bị câu • Bấm HIỆN CÂU HỎI để đưa nội dung lên TV";
  if (l.mode === "welcome") return "Đang hiện màn hình chào";
  if (l.mode === "score") return "Đang hiện bảng điểm";
  if (l.mode === "winner") return "Đang công bố vô địch";
  if (l.settled) return "Câu đã kết thúc • Chọn câu tiếp theo khi sẵn sàng";
  if (l.freeForAll) return "⚡ Tự do giành quyền trả lời!";
  if (qCurrent()?.category === "backup")
    return "Dự phòng • Chọn tổ giành quyền trả lời";
  if (qCurrent()?.category === "special")
    return "Vòng cá nhân • Sai được thử tiếp";
  return "Đang nhận câu trả lời";
}
function livePage() {
  const q = qCurrent(),
    l = state.live,
    special = q?.category === "special",
    shown = l.mode === "question",
    active = shown && !l.settled && (special || l.team !== null);
  const index = state.questions.findIndex((x) => x.id === q?.id),
    selected = q?.id;
  if (q?.category === "video") return videoLivePage(q, index);
  return `<div class="question-picker"><select id="select-q" aria-label="Chọn câu hỏi">${state.questions.map((q, i) => `<option value="${q.id}" ${q.id === selected ? "selected" : ""}>${i + 1}. [${cats[q.category]}] ${esc(q.title)}</option>`).join("")}</select>${button("HIỆN CÂU HỎI", "show", "primary", !q ? "disabled" : "")}${button("CÂU TRƯỚC", "previous", "", index <= 0 ? "disabled" : "")}${button("CÂU TIẾP THEO", "next", "", index >= state.questions.length - 1 ? "disabled" : "")}</div>
 <div class="team-selectors compact-teams">${state.teams.map((t, i) => `<div class="team-box ${l.team === i && !special ? "active" : ""}">${button(`<b>Tổ ${i + 1}</b><small>${t.name === `Tổ ${i + 1}` ? "" : esc(t.name)}</small>`, "team", "team-choose", `data-index="${i}" ${special ? "disabled" : ""}`)}<div class="score-adjust">${button("−", "adjustScore", "", `data-index="${i}" data-delta="-1" aria-label="Trừ điểm Tổ ${i + 1}"`)}<strong>${t.score} điểm</strong>${button("+", "adjustScore", "", `data-index="${i}" data-delta="1" aria-label="Cộng điểm Tổ ${i + 1}"`)}</div></div>`).join("")}</div>
 <div class="live-status" role="status"><span class="dot"></span>${liveStatus()}<span class="badge">${special ? "Cá nhân" : l.team === null ? "Chưa chọn tổ" : esc(state.teams[l.team].name)}</span></div>
 <div class="operator-layout"><section class="panel answer-console"><p class="eyebrow">Riêng Admin · Câu ${index + 1}</p><h2 class="live-question">${esc(q?.title || "Chưa có câu hỏi")}</h2>
 ${q?.type === "choice" ? `<p class="muted small-note">Bấm phương án để chấm ngay.</p><div class="answer-buttons">${q.options.map((o, i) => button(`<b>${String.fromCharCode(65 + i)}</b> ${esc(o)}${i === q.correct ? '<small class="correct-badge">✓ Đáp án đúng</small>' : ""}`, "chooseOption", `answer-button ${i === q.correct ? "stored-correct" : ""} ${l.selectedOption === i ? "selected" : ""}`, `data-index="${i}" ${!active ? "disabled" : ""}`)).join("")}</div>` : `<div class="reference-answer"><b>Đáp án tham khảo</b><p>${esc(q?.answer)}</p></div><div class="judge-buttons">${button(special ? "ĐÚNG / CHỐT ĐÁP ÁN" : "ĐÚNG (+1)", "correct", "correct-button", !active ? "disabled" : "")}${button("SAI (0 ĐIỂM)", "incorrect", "bad", !active ? "disabled" : "")}</div>`}
 <div class="answer-explanation"><b>Giải thích đáp án</b><p>${esc(q?.explanation || "Chưa có giải thích.")}</p></div></section>
 <section class="center-tv"><p class="eyebrow">ĐANG TRÊN TV</p><div class="tv-preview-mount"></div><div class="row central-controls">${button("CHỊU THUA / CHUYỂN TỔ", "giveup", "", !active || special ? "disabled" : "")}${q?.hintEnabled ? button(l.hint ? "ẨN GỢI Ý" : "HIỆN GỢI Ý", "hint", "", !shown ? "disabled" : "") : ""}${button(l.reveal ? "ĐÃ HIỆN ĐÁP ÁN" : "HIỆN ĐÁP ÁN", "reveal", "", !shown || l.reveal ? "disabled" : "")}</div><p class="muted small-note">${l.freeForAll ? "Chọn tổ giơ tay trước. Sai vẫn ẩn đáp án để tổ khác thử." : q?.category === "backup" ? "Dự phòng: chọn bất kỳ tổ nào; sai vẫn giữ kín đáp án." : special ? "Trả lời sai vẫn được thử tiếp. Chấm đúng không cộng điểm tổ." : "Lượt thường: chọn đáp án sẽ chốt câu và công bố đáp án ngay."}</p></section>
 <aside class="live-side"><div class="panel timer-panel"><div class="row spread"><h3>Đồng hồ</h3><label class="inline"><input id="liveTimerEnabled" type="checkbox" ${state.settings.timerEnabled ? "checked" : ""}> Sử dụng</label></div>${state.settings.timerEnabled ? `<div class="timer" data-clock></div><div class="row"><input id="liveSeconds" type="number" min="5" max="3600" value="${state.settings.seconds}" aria-label="Thời gian trả lời">${button("Áp dụng", "duration")}</div><div class="row">${button(l.deadline ? "Tạm dừng" : l.remaining < state.settings.seconds * 1000 && l.remaining > 0 ? "Tiếp tục" : "Bắt đầu", "timer", "primary", !shown ? "disabled" : "")}${button("Đặt lại", "resetTimer")}</div>` : '<p class="muted">Đồng hồ đã tắt.</p>'}</div>
 <div class="panel media-controls"><h3>Trình chiếu & âm thanh</h3><div class="row">${button("Màn hình chào", "welcome")}${button("Bảng điểm", "scoreMode")}${button("🏆 CÔNG BỐ VÔ ĐỊCH", "announceTeam", "primary")}${q?.media.some((m) => m.kind !== "image") ? button(l.mediaPlaying ? "Dừng tệp câu hỏi" : "Phát tệp câu hỏi", "media", "", !shown ? "disabled" : "") : ""}${q?.hintEnabled && q.hintMedia.some((m) => m.kind !== "image") ? button(l.hintPlaying ? "Dừng tệp gợi ý" : "Phát tệp gợi ý", "hintMedia", "", !shown || !l.hint ? "disabled" : "") : ""}</div></div></aside></div>
 <details class="score-history-details"><summary>Lịch sử điều chỉnh điểm</summary><div class="score-history">${
   state.scoreLog
     .slice()
     .reverse()
     .map(
       (e) =>
         `<p>${new Date(e.at).toLocaleTimeString("vi-VN")} · ${esc(e.name)} · ${esc(e.reason)}: ${e.before} → ${e.after}</p>`,
     )
     .join("") || "<p>Chưa có thay đổi điểm.</p>"
 }</div></details>`;
}
function videoLivePage(q, index) {
  const l = state.live,
    shown = l.mode === "video";
  return `<div class="question-picker"><select id="select-q" aria-label="Chọn câu hỏi">${state.questions.map((x, i) => `<option value="${x.id}" ${x.id === q.id ? "selected" : ""}>${i + 1}. [${cats[x.category]}] ${esc(x.title)}</option>`).join("")}</select>${button("HIỆN VIDEO", "show", "primary")}${button("CÂU TRƯỚC", "previous", "", index <= 0 ? "disabled" : "")}${button("CÂU TIẾP THEO", "next", "", index >= state.questions.length - 1 ? "disabled" : "")}</div>
  <div class="panel"><p class="eyebrow">Video đặc biệt</p><h2>${esc(q.title)}</h2><p>${shown ? "Đang trình chiếu video trên TV" : "Bấm HIỆN VIDEO để phát trên TV"}</p>
  <p class="eyebrow">ĐANG TRÊN TV</p><div class="tv-preview-mount"></div>
  <div class="row">${button(l.mediaPlaying && shown ? "Tạm dừng" : "Phát", "videoPlayback", "primary", shown ? "" : "disabled")}${button("Phát lại từ đầu", "videoRestart", "", shown ? "" : "disabled")}
  <label>Âm lượng <input id="videoVolume" aria-label="Âm lượng video" type="range" min="0" max="1" step="0.05" value="${l.videoVolume}"></label>
  ${button(l.videoMuted ? "Bật tiếng" : "Tắt tiếng", "videoMute")}${button("Màn hình chào", "welcome")}</div>
  <p class="muted">Tải video MP4 ở Quản lý câu hỏi. Bấm Bật âm thanh một lần trên cửa sổ TV nếu trình duyệt yêu cầu. Khung xem trước luôn tắt tiếng.</p></div>`;
}
function videoEditor() {
  return `<div class="panel"><div class="row spread"><h2>Biên tập Video đặc biệt</h2><div class="row">${button("Lưu câu hỏi", "save", "primary")}${button("Hủy", "cancel")}</div></div>
  <label for="category">Nhóm / Loại</label><select id="category" disabled><option value="video">Video đặc biệt</option></select>
  <label for="title">Tiêu đề video</label><textarea id="title" maxlength="10000">${esc(draft.title)}</textarea>
  <label for="upload">Video MP4 từ máy tính</label><input id="upload" type="file" accept=".mp4,video/mp4">
  <p class="muted">Một video MP4, tối đa 100 MB. Tải tệp mới sẽ thay tệp đang chọn khi lưu.</p>
  <div class="row">${draft.media.map((m, i) => `<span class="media-chip">${esc(m.name)} ${button("×", "removeMedia", "", `data-index="${i}" aria-label="Gỡ tệp"`)}</span>`).join("")}</div></div>`;
}
// The preview runs the actual audience renderer and public projection, muted.
// Keep its frame mounted across Admin renders so media does not restart on clicks.
let previewHost = null,
  previewObserver = null;
function placeTVPreview() {
  const mount = $(".tv-preview-mount");
  if (!previewHost) return;
  previewHost.hidden = !mount;
  if (!mount) return;
  const r = mount.getBoundingClientRect();
  Object.assign(previewHost.style, {
    left: `${r.left + scrollX}px`,
    top: `${r.top + scrollY}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
  previewHost.firstChild.style.transform = `scale(${r.width / 1280})`;
}
function mountTVPreview() {
  if (!tv && !previewHost) {
    previewHost = document.createElement("div");
    previewHost.className = "tv-preview-surface";
    previewHost.innerHTML =
      '<iframe src="/audience?preview=1" title="Đang trên TV" tabindex="-1" width="1280" height="720"></iframe>';
    document.body.append(previewHost);
  }
  previewObserver?.disconnect();
  const mount = $(".tv-preview-mount");
  if (mount) {
    previewObserver = new ResizeObserver(placeTVPreview);
    previewObserver.observe(mount);
  }
  placeTVPreview();
}
addEventListener("resize", placeTVPreview);
addEventListener("scroll", placeTVPreview);
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
    )}</span>${button("+ Thêm câu hỏi", "new", "primary")}</div><div class="notice">Các câu hỏi ban đầu là nội dung giữ chỗ. Hãy thay nội dung và kiểm tra đáp án trước sự kiện.</div><div class="question-list">${state.questions.map((q, i) => `<div class="question-row"><span class="num">${String(i + 1).padStart(2, "0")}</span><div class="text"><strong>${esc(q.title)}</strong><span class="badge">${cats[q.category]}</span> <small>${q.type === "video" ? "Video đặc biệt" : q.type === "choice" ? "Trắc nghiệm" : "Tự luận"} · ${q.media.length} tệp</small></div>${button("↑", "up", "", `data-id="${q.id}" aria-label="Chuyển lên" ${i === 0 || state.questions[i - 1].category !== q.category ? "disabled" : ""}`)}${button("↓", "down", "", `data-id="${q.id}" aria-label="Chuyển xuống" ${i === state.questions.length - 1 || state.questions[i + 1].category !== q.category ? "disabled" : ""}`)}${button("Sửa", "edit", "", `data-id="${q.id}"`)}${button("Nhân bản", "duplicate", "", `data-id="${q.id}"`)}${button("Xóa", "delete", "bad", `data-id="${q.id}"`)}</div>`).join("")}</div>`;
}
function editor() {
  if (draft.category === "video") return videoEditor();
  return `<div class="panel"><div class="row spread"><h2>Biên tập câu hỏi</h2><div class="row">${button("Xem trước", "preview")}${button("Hủy", "cancel")}${button("Lưu câu hỏi", "save", "primary")}</div></div><div class="editor-grid"><section><label for="title">Nội dung câu hỏi</label><textarea id="title" maxlength="10000">${esc(draft.title)}</textarea><label for="category">Nhóm câu hỏi</label><select id="category">${Object.entries(
    cats,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${draft.category === k ? "selected" : ""}>${v}</option>`,
    )
    .join(
      "",
    )}</select><label for="type">Loại câu hỏi</label><select id="type" ${draft.category === "special" ? "disabled" : ""}><option value="choice" ${draft.type === "choice" ? "selected" : ""}>Trắc nghiệm</option><option value="open" ${draft.type === "open" ? "selected" : ""}>Tự luận</option></select><div id="choices" ${draft.type === "open" ? "hidden" : ""}><label>Các phương án • tích chọn đáp án đúng</label>${draft.options.map((o, i) => `<div class="fieldrow"><input type="radio" name="correct" value="${i}" aria-label="Đáp án đúng ${i + 1}" ${draft.correct === i ? "checked" : ""}><input data-option="${i}" value="${esc(o)}" aria-label="Phương án ${i + 1}" maxlength="10000">${button("×", "removeOption", "", `data-index="${i}" aria-label="Xóa phương án ${i + 1}" ${draft.options.length <= 2 ? "disabled" : ""}`)}</div>`).join("")}${button("+ Thêm phương án", "addOption", "", draft.options.length >= 10 ? "disabled" : "")}</div><div id="reference-fields" ${draft.type === "choice" ? "hidden" : ""}><label for="answer">Đáp án tham khảo (tự luận)</label><textarea id="answer">${esc(draft.answer)}</textarea></div></section><section><label class="hint-toggle"><input id="hintEnabled" type="checkbox" ${draft.hintEnabled ? "checked" : ""}> Có gợi ý</label><div id="hint-fields" ${draft.hintEnabled ? "" : "hidden"}><label for="hint">Nội dung gợi ý duy nhất</label><textarea id="hint">${esc(draft.hint)}</textarea><label for="hintUpload">Ảnh, âm thanh, video cho gợi ý</label><input id="hintUpload" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mp3,.wav,.ogg,.m4a"><div class="row">${draft.hintMedia.map((m, i) => `<span class="media-chip">${esc(m.name)} ${button("×", "removeHintMedia", "", `data-index="${i}" aria-label="Gỡ tệp gợi ý"`)}</span>`).join("")}</div><p class="muted">Tắt Có gợi ý chỉ ẩn gợi ý; nội dung và tệp vẫn được giữ.</p></div><label for="explanation">Giải thích đáp án</label><textarea id="explanation">${esc(draft.explanation)}</textarea><label for="upload">Ảnh, âm thanh, video từ máy tính</label><input id="upload" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mp3,.wav,.ogg,.m4a"><p class="muted"><small>Tối đa 10 tệp/câu, 100 MB/tệp. Ưu tiên MP4 H.264, MP3, PNG/JPG để tương thích với TV. Nên giới hạn 1–2 tệp/câu để dễ đọc.</small></p><div class="row">${draft.media.map((m, i) => `<span class="media-chip">${esc(m.name)} ${button("×", "removeMedia", "", `data-index="${i}" aria-label="Gỡ tệp"`)}</span>`).join("")}</div><div class="notice">Tệp tải lên được lưu cục bộ. Sao lưu sẽ bao gồm toàn bộ nội dung và tệp đính kèm đã lưu vào câu hỏi.</div></section></div></div>`;
}
function capture() {
  if (!draft) return;
  if (draft.category === "video" && !$("#type")) {
    draft.title = $("#title").value;
    return;
  }
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
function settingsPage() {
  const s = state.settings;
  return `<div class="editor-grid"><div class="panel"><h2>Thể lệ linh hoạt</h2><label for="seconds">Thời gian mỗi lượt (5–3600 giây)</label><input id="seconds" type="number" min="5" max="3600" value="${s.seconds}"><label><input id="autoPass" type="checkbox" ${s.autoPass ? "checked" : ""}> Tự chuyển đội khi hết giờ</label><label><input id="timerEnabled" type="checkbox" ${s.timerEnabled ? "checked" : ""}> Sử dụng đồng hồ</label><label><input id="warningSound" type="checkbox" ${s.warningSound ? "checked" : ""}> Âm báo khi hết giờ trên TV (bấm Bật âm thanh trên TV trước)</label><p class="notice">Câu thường và dự phòng: đúng +1. Siêu khó: không cộng điểm tổ. Bốn tổ chịu thua sẽ tự mở vòng tự do.</p><label for="specialRules">Thể lệ câu đặc biệt (hiện trên TV)</label><textarea id="specialRules" maxlength="2000">${esc(s.specialRules)}</textarea></div><div class="panel"><h2>Không gian trình chiếu</h2>${state.teams.map((t, i) => `<label for="teamname${i}">Tên tổ ${i + 1}</label><input id="teamname${i}" maxlength="100" value="${esc(t.name)}">`).join("")}${button("Lưu tên tổ", "saveTeams")}<label for="eventTitle">Thông điệp màn hình chào</label><input id="eventTitle" maxlength="2000" value="${esc(s.title)}"><label for="prize">Tên giải thưởng đặc biệt</label><input id="prize" maxlength="2000" value="${esc(s.prize)}"><label for="accent">Màu nhấn</label><input id="accent" type="color" value="${s.accent}"><div class="notice">Sau khi đổi thời gian, bấm “Đặt lại” đồng hồ để áp dụng cho lượt đang mở.</div>${button("Lưu thiết lập", "saveSettings", "primary")}</div></div><div class="panel"><h2>Dữ liệu & sao lưu</h2><p class="muted">Lưu bản sao vào USB trước sự kiện. Giữ tổng dữ liệu dưới 140 MB để có thể khôi phục bằng tệp sao lưu (giới hạn 200 MB).</p><div class="row"><a class="button" href="/api/backup" download>Sao lưu toàn bộ</a><label style="margin:0">Khôi phục từ bản sao<input id="restore" type="file" accept=".json"></label>${button("Bắt đầu sự kiện mới", "reset", "bad")}</div><p class="muted"><small>Bắt đầu mới đặt lại điểm và tiến trình, giữ câu hỏi, tệp và thiết lập. Có thể hoàn tác.</small></p></div>`;
}
function helpPage() {
  return `<div class="panel help"><h2>Chuẩn bị và điều khiển</h2><ol><li><b>Quản lý câu hỏi:</b> bản cài mới gồm 8 câu Trong MV (1–8), 4 Chủ đề khác (9–12), 5 Dự phòng (13–17), Siêu khó tự luận (18), Video đặc biệt (19). Câu phân định hòa cũ được chuyển sang Dự phòng, không xóa nội dung. Vì vậy dữ liệu cũ có thể nhiều hơn 19 mục.</li><li><b>Chuẩn bị câu:</b> chọn từ danh sách hoặc bấm CÂU TRƯỚC / CÂU TIẾP THEO. TV chỉ hiện Chuẩn bị..., số câu và nhóm; Admin đã thấy câu, đáp án đúng và giải thích. Chỉ bấm HIỆN CÂU HỎI mới đưa nội dung lên TV.</li><li><b>Chấm trắc nghiệm:</b> bấm ngay A/B/C/D theo câu trả lời. Lượt thường: đúng +1, sai +0; cả hai đều công bố đáp án và kết thúc câu. Không có bước xác nhận thứ hai. Tự luận dùng ĐÚNG / SAI.</li><li><b>Chuyển lượt:</b> CHỊU THUA không lộ đáp án, chuyển sang tổ tiếp theo. Bốn tổ khác nhau cùng chịu thua sẽ tự mở ⚡ Tự do giành quyền trả lời! và bỏ chọn tổ. Bấm tổ giơ tay trước rồi chấm; sai vẫn ẩn đáp án, bỏ chọn tổ để tổ khác thử. Đúng hoặc HIỆN ĐÁP ÁN sẽ kết thúc câu.</li><li><b>Sang câu kế:</b> câu thường tiếp theo bắt đầu từ tổ sau tổ vừa chốt đáp án, kể cả chốt sai. Ví dụ Tổ 2 trả lời cuối cùng → câu tiếp bắt đầu Tổ 3. Có thể bấm chọn tổ để đổi lượt bất kỳ lúc nào.</li></ol><h2>Dự phòng và Siêu khó</h2><p>Dự phòng dùng để phân định hòa hoặc chơi thêm: chọn tổ giơ tay trước, đúng +1 và công bố đáp án; sai giữ kín và cho tổ khác thử. HIỆN ĐÁP ÁN chốt câu nếu không ai trả lời được.</p><p>Siêu khó dành cho cá nhân, luôn tự luận. SAI giữ kín đáp án và tiếp tục; ĐÚNG / CHỐT ĐÁP ÁN công bố đáp án và phản hồi chúc mừng. Không cộng điểm tổ, không cần nhập tên người thắng.</p><h2>Điểm và trình chiếu</h2><p>Chỉnh điểm bằng − / + ngay trong thẻ tổ, không làm đổi tổ đang trả lời. HOÀN TÁC phục hồi thao tác vừa nhầm. Mỗi câu đã kết thúc không thể chấm lại khi quay về; muốn sửa hãy hoàn tác hoặc chỉnh điểm. Công bố tổ có điểm cao nhất bằng 🏆 CÔNG BỐ VÔ ĐỊCH. Nếu hòa, dùng câu Dự phòng trước.</p><p>Khung ĐANG TRÊN TV dùng cùng giao diện TV, gồm trạng thái chờ, câu, đáp án đã công bố, điểm và đồng hồ; video xem trước tắt tiếng để tránh âm thanh lặp. Thông tin đúng/sai riêng của Admin không xuất hiện ở đó trước khi được công bố theo luật.</p><p>Gợi ý chỉ hiện khi MC bật, không trừ điểm. Tắt Có gợi ý trong biên tập vẫn giữ nội dung và tệp. Khi bật Sử dụng đồng hồ, HIỆN CÂU HỎI tự đặt lại và chạy đồng hồ. Có thể Tạm dừng, Tiếp tục hoặc Đặt lại. Mỗi lần hiện câu đều giấu đáp án, kể cả câu đã chấm; câu đã chấm không cộng điểm lại, MC dùng HIỆN ĐÁP ÁN để công bố lại. Mặc định hết giờ không chốt câu; tự chuyển và âm báo là tùy chọn trong Thiết lập.</p><h2>Video đặc biệt</h2><p>Mục cuối dành cho video MP4 kết chương trình. Biên tập tiêu đề và tải video tại Quản lý câu hỏi. Bấm HIỆN VIDEO để phát sạch trên TV, không điểm/đồng hồ/khung câu hỏi. Admin có Phát/Tạm dừng, Phát lại từ đầu, âm lượng và tắt tiếng. Khung TV xem trước luôn tắt tiếng.</p><h2>TV và dữ liệu</h2><p>Kết nối HDMI → Windows + P → Mở rộng. Mở màn hình TV và kéo sang TV; Toàn màn hình mở/thoát hai chiều, Esc để thoát. Bấm Bật âm thanh một lần rồi điều khiển phát từ Admin. Giữ cửa sổ khởi động mở. Sao lưu toàn bộ trước khi nâng cấp; giải nén bản mới vào thư mục riêng rồi Khôi phục từ bản sao. Không xóa dữ liệu bản cũ.</p></div>`;
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
    await action("select", { id: e.target.value });
    return;
  }
  if (e.target.id === "videoVolume") {
    await action("videoAudio", { volume: Number(e.target.value) });
    return;
  }
  if (e.target.id === "liveTimerEnabled") {
    await action("settings", {
      settings: { ...state.settings, timerEnabled: e.target.checked },
    });
    return;
  }
  if (["type", "hintEnabled", "category"].includes(e.target.id)) {
    capture();
    if (draft.category === "special") draft.type = "open";
    if (draft.category === "video") draft.type = "video";
    render();
  }
  if (e.target.id === "upload" || e.target.id === "hintUpload") {
    const mediaField = e.target.id === "hintUpload" ? "hintMedia" : "media";
    capture();
    busy = true;
    try {
      for (const file of e.target.files) {
        if (draft.category === "video" && !/\.mp4$/i.test(file.name))
          throw Error("Hãy chọn một video MP4.");
        if (draft.category !== "video" && draft[mediaField].length >= 10)
          throw Error("Tối đa 10 tệp cho mỗi câu.");
        if (file.size > 100 * 1024 * 1024)
          throw Error("Mỗi tệp tối đa 100 MB.");
        toast("Đang lưu tệp: " + file.name);
        const uploaded = await request(
          "/api/upload?name=" + encodeURIComponent(file.name),
          {
            method: "POST",
            body: file,
          },
        );
        if (draft.category === "video") draft.media = [uploaded];
        else draft[mediaField].push(uploaded);
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
        el.muted = state.live.mode === "video" ? state.live.videoMuted : false;
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
    case "videoMute":
      await action("videoAudio", { muted: !state.live.videoMuted });
      break;
    case "show":
      await action("show", { id: $("#select-q").value });
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
    case "adjustScore":
      await action("adjustScore", { index: i, delta: Number(b.dataset.delta) });
      break;
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
          score: t.score,
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
          backupPoints: 1,
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
      const index = state.questions.findIndex((q) => q.id === qCurrent()?.id),
        q = state.questions[index + (a === "next" ? 1 : -1)];
      if (q) await action("select", { id: q.id });
      break;
    }
    case "announceTeam": {
      const max = Math.max(...state.teams.map((t) => t.score)),
        winners = state.teams.filter((t) => t.score === max);
      if (winners.length !== 1)
        return toast("Đang hòa điểm. Hãy chọn câu Dự phòng để phân định.");
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
    case "reset":
      if (confirm("Đặt lại tất cả điểm và tiến trình cho sự kiện mới?"))
        await action("reset");
      break;
    default:
      await action(a);
  }
});
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
