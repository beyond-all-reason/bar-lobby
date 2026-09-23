// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BrowserWindow, Menu } from "electron";

// Electron installs a default menu whose accelerators still fire when the bar is hidden: reload,
// dev tools, native fullscreen and closing the window among them. macOS keeps the app and edit
// menus, because that is the only route its clipboard shortcuts have into a text field.
export function installApplicationMenu() {
    Menu.setApplicationMenu(process.platform === "darwin" ? Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }]) : null);
}

export function suppressBrowserBehaviours(window: BrowserWindow, appUrl: string, devToolsAllowed: () => boolean) {
    const { webContents } = window;
    const appDocument = new URL(appUrl);

    // Routes live in the router and never navigate the document, so anything that would is foreign:
    // a file or link dropped onto the window, most often.
    webContents.on("will-frame-navigate", (event) => {
        if (!isAppDocument(event.url, appDocument)) event.preventDefault();
    });

    // Whether dev tools may open is a setting that can change at any time, so the window keeps them
    // available and turns them away here, whatever route opened them.
    webContents.on("devtools-opened", () => {
        if (!devToolsAllowed()) webContents.closeDevTools();
    });

    webContents.on("before-input-event", (event, input) => {
        if (input.type !== "keyDown" || input.isAutoRepeat || !isDevToolsShortcut(input) || !devToolsAllowed()) return;

        event.preventDefault();
        webContents.toggleDevTools();
    });
}

function isAppDocument(target: string, appDocument: URL) {
    const url = URL.parse(target);

    return url !== null && url.protocol === appDocument.protocol && url.host === appDocument.host && url.pathname === appDocument.pathname;
}

// Matched on the physical key, because Option on macOS turns I into a different character.
function isDevToolsShortcut(input: Electron.Input) {
    if (input.code === "F12") return true;

    if (input.code !== "KeyI") return false;

    return process.platform === "darwin" ? input.meta && input.alt : input.control && input.shift;
}
