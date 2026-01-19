import { defineConfig } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
// playwright.config.ts

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30000,
    use: {
        baseURL: "http://127.0.0.1:5173",
        headless: false,
    },
    webServer: {
        command: "vite --config vite.playwright.config.mts --logLevel silent",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: "ignore",
        stderr: "pipe",
    },
    projects: [
        {
            name: "electron",
            testMatch: /.*\.spec\.ts/,
        },
    ],
});
