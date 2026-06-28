// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { _electron as electron, ElectronApplication, Page } from "playwright";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import path from "node:path";

const { describe, beforeAll, afterAll } = test;

describe("Electron App", async () => {
    let electronApp: ElectronApplication;
    let splashWindow: Page;
    let mainWindow: Page;

    beforeAll(async () => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));

        const appDir = path.resolve(__dirname, "../../");
        const args = [appDir];

        if (process.env.CI) {
            args.unshift("--no-sandbox");
        }

        electronApp = await electron.launch({ args });
        splashWindow = await electronApp.firstWindow();
        mainWindow = await electronApp.waitForEvent("window", { predicate: (window) => window !== splashWindow });
    });

    afterAll(async () => {
        await electronApp.close();
    });

    test("run app", async () => {
        const title = await mainWindow.title();
        expect(title).toBeTruthy();
    });

    test("Main window state", async () => {
        const windowState: { isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean } = await electronApp.evaluate(async ({ BrowserWindow }) => {
            const windows = BrowserWindow.getAllWindows();
            const targetMainWindow =
                windows.find((w) => {
                    const url = w.webContents.getURL();
                    return url.includes("index.html") && !url.includes("splash");
                }) || windows[windows.length - 1];

            if (!targetMainWindow) {
                throw new Error("Could not find the main window process.");
            }

            function getState() {
                return {
                    isVisible: targetMainWindow.isVisible(),
                    isDevToolsOpened: targetMainWindow.webContents.isDevToolsOpened(),
                    isCrashed: targetMainWindow.webContents.isCrashed(),
                };
            }

            return new Promise((resolve) => {
                if (targetMainWindow.isVisible()) {
                    resolve(getState());
                } else targetMainWindow.once("ready-to-show", () => setTimeout(() => resolve(getState()), 0));
            });
        });

        expect(windowState.isCrashed, "The app has crashed").toBeFalsy();
        expect(windowState.isVisible, "The main window was not visible").toBeTruthy();
        expect(windowState.isDevToolsOpened, "The DevTools panel was open").toBeFalsy();
    });

    test("Main window web content", async () => {
        const element = await mainWindow.$("#app", { strict: true });
        expect(element, "Was unable to find the root element").not.toBeNull();
    });
});
