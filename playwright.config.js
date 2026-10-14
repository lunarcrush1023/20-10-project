import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:2011",
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node server.mjs",
    url: "http://127.0.0.1:2011",
    env: {
      PORT: "2011",
      STUDIO_DATA: mkdtempSync(join(tmpdir(), "studio-2010-browser-")),
    },
    reuseExistingServer: false,
  },
});
