// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { /*afterAll, beforeAll,*/ expect, test } from "vitest";

/**
 * TODO
 * make this work
 */
test("sanity check", () => {
    expect(true).toBe(true);
});
// let electronApp: ElectronApplication;

// beforeAll(async () => {
//     electronApp = await electron.launch({ args: ["."] });
// });

// afterAll(async () => {
//     await electronApp.close();
// });

// test("Main window state", async () => {
//     const windowState: { isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean } = await electronApp.evaluate(({ BrowserWindow }) => {
//         const mainWindow = BrowserWindow.getAllWindows()[0];

//         function getState() {
//             return {
//                 isVisible: mainWindow.isVisible(),
//                 isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
//                 isCrashed: mainWindow.webContents.isCrashed(),
//             };
//         }

//         return new Promise((resolve) => {
//             if (mainWindow.isVisible()) {
//                 resolve(getState());
//             } else mainWindow.once("ready-to-show", () => setTimeout(() => resolve(getState()), 0));
//         });
//     });

//     expect(windowState.isCrashed, "The app has crashed").toBeFalsy();
//     expect(windowState.isVisible, "The main window was not visible").toBeTruthy();
//     expect(windowState.isDevToolsOpened, "The DevTools panel was open").toBeFalsy();
// });

// test("Main window web content", async () => {
//     const page = await electronApp.firstWindow();
//     const element = await page.$("#app", { strict: true });
//     expect(element, "Was unable to find the root element").toBeDefined();
//     expect((await element.innerHTML()).trim(), "Window content was empty").not.equal("");
// });
