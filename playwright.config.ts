// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: CC0-1.0

import { defineConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const PORT = 5173;
const HOST = "127.0.0.1";
const URL = `http://${HOST}:${PORT}`;

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30_000,

    use: {
        baseURL: URL,
        headless: !!process.env.CI,
    },

    webServer: {
        command: `vite --config vite.playwright.config.mts --host ${HOST} --port ${PORT} --strictPort`,
        url: URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
    },

    projects: [{ name: "electron", testMatch: /.*\.spec\.ts/ }],
});
