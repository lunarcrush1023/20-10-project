import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { initial, act, validate, audience, remaining } from "./game.mjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  dir = process.env.STUDIO_DATA || path.join(root, "data"),
  port = Number(process.env.PORT || 2010);
fs.mkdirSync(path.join(dir, "media"), { recursive: true });
const statePath = path.join(dir, "game.json");
let state = initial(),
  revision = 1;
const instance = randomUUID();
if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    validate(state);
    state.history = [];
    state.live.remaining = remaining(state);
    state.live.deadline = null;
  } catch (e) {
    console.error(
      "Du lieu khong doc duoc. Giu nguyen tep data/game.json de khoi phuc.",
      e.message,
    );
    process.exit(1);
  }
}
function save(next) {
  fs.writeFileSync(statePath + ".tmp", JSON.stringify(next));
  fs.renameSync(statePath + ".tmp", statePath);
  state = next;
  revision++;
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};
const extensions = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  mp4: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
};
async function body(req, max = 200 * 1024 * 1024) {
  let size = 0,
    chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > max)
      throw Error("Tệp quá lớn. Giới hạn tải lên 100 MB, bản sao lưu 200 MB.");
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
function mediaFile(name) {
  if (!/^[a-f0-9-]+\.(png|jpg|webp|gif|mp4|webm|mp3|wav|ogg|m4a)$/.test(name))
    throw Error("Tên tệp không hợp lệ.");
  return path.join(dir, "media", name);
}
const server = http.createServer(async (req, res) => {
  try {
    if (
      req.headers.host !== `127.0.0.1:${port}` &&
      req.headers.host !== `localhost:${port}`
    ) {
      res.writeHead(403);
      return res.end();
    }
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (
      req.method === "POST" &&
      req.headers.origin !== `http://${req.headers.host}`
    ) {
      return json(res, { error: "Nguồn yêu cầu không hợp lệ." }, 403);
    }
    if (url.pathname === "/api/audience")
      return json(res, { ...audience(state), revision, instance });
    if (url.pathname === "/api/state")
      return json(res, {
        ...state,
        history: undefined,
        undoCount: state.history.length,
        revision,
        instance,
        serverTime: Date.now(),
      });
    if (url.pathname === "/api/action" && req.method === "POST") {
      const a = JSON.parse(await body(req, 2 * 1024 * 1024));
      if (a.revision !== revision)
        return json(
          res,
          { error: "Dữ liệu đã thay đổi. Vui lòng thử lại." },
          409,
        );
      save(act(state, a));
      return json(res, { ok: true });
    }
    if (url.pathname === "/api/upload" && req.method === "POST") {
      const name = url.searchParams.get("name") || "",
        ext = path.extname(name).slice(1).toLowerCase();
      if (!extensions[ext])
        throw Error(
          "Hãy chọn ảnh PNG/JPG/WebP/GIF, video MP4/WebM hoặc âm thanh MP3/WAV/OGG/M4A.",
        );
      const bytes = await body(req, 100 * 1024 * 1024),
        file = randomUUID() + "." + (ext === "jpeg" ? "jpg" : ext);
      fs.writeFileSync(mediaFile(file), bytes);
      return json(res, {
        file,
        kind: extensions[ext],
        name: name.slice(0, 200),
      });
    }
    if (url.pathname === "/api/backup") {
      const files = {};
      for (const q of state.questions)
        for (const m of q.media)
          files[m.file] = fs.readFileSync(mediaFile(m.file)).toString("base64");
      const data = JSON.stringify({
        format: "studio-2010-v1",
        state: {
          ...state,
          history: [],
          live: { ...state.live, remaining: remaining(state), deadline: null },
        },
        files,
      });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="Sao-luu-20-10.json"',
      });
      return res.end(data);
    }
    if (url.pathname === "/api/restore" && req.method === "POST") {
      const b = JSON.parse(await body(req));
      if (
        b.format !== "studio-2010-v1" ||
        !b.files ||
        typeof b.files !== "object"
      )
        throw Error("Không đúng định dạng sao lưu.");
      validate(b.state);
      const staged = [];
      for (const q of b.state.questions)
        for (const m of q.media) {
          if (
            typeof b.files[m.file] !== "string" ||
            !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
              b.files[m.file],
            )
          )
            throw Error("Bản sao lưu thiếu hoặc hỏng tệp đính kèm.");
          staged.push([
            mediaFile(m.file),
            Buffer.from(b.files[m.file], "base64"),
          ]);
        }
      fs.writeFileSync(
        path.join(dir, "before-restore.json"),
        JSON.stringify(state),
      );
      for (const [file, bytes] of staged) fs.writeFileSync(file, bytes);
      b.state.history = [];
      b.state.live.remaining = remaining(b.state);
      b.state.live.deadline = null;
      save(b.state);
      return json(res, { ok: true });
    }
    if (req.method !== "GET")
      return json(res, { error: "Không hỗ trợ yêu cầu này." }, 405);
    let file;
    if (url.pathname.startsWith("/media/"))
      file = mediaFile(url.pathname.slice(7));
    else {
      const allowed = {
        "/": "index.html",
        "/audience": "index.html",
        "/app.js": "app.js",
        "/style.css": "style.css",
      };
      if (!allowed[url.pathname])
        return json(res, { error: "Không tìm thấy." }, 404);
      file = path.join(root, "public", allowed[url.pathname]);
    }
    if (!fs.existsSync(file))
      return json(res, { error: "Không tìm thấy tệp." }, 404);
    const size = fs.statSync(file).size,
      headers = {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      };
    if (req.headers.range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!m) {
        res.writeHead(416);
        return res.end();
      }
      const start = Number(m[1]),
        end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, { "Content-Range": `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, "Content-Length": size });
      fs.createReadStream(file).pipe(res);
    }
  } catch (e) {
    if (!res.headersSent) json(res, { error: e.message }, 400);
    else res.end();
  }
});
setInterval(() => {
  if (state.live.deadline !== null && remaining(state) === 0) {
    try {
      save(act(state, { type: "expired" }));
    } catch (e) {
      console.error(e.message);
    }
  }
}, 200).unref();
server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? "Ung dung da mo hoac cong 2010 dang duoc su dung."
      : "Khong the khoi dong: " + e.message,
  );
  process.exit(1);
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `20/10 Minigame Studio: http://127.0.0.1:${port}\nGiu cua so nay mo trong su kien.`,
  ),
);
