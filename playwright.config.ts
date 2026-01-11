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
export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30000,
    use: {
        headless: false,
    },
    projects: [
        {
            name: "electron",
            testMatch: /.*\.spec\.ts/,
        },
    ],
    globalSetup: "./tests/setup.e2e.mts",
    globalTeardown: "./tests/teardown.e2e.mts",
});
