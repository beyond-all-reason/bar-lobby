// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { STATE_PATH, CONFIG_PATH, WRITE_DATA_PATH, REPLAYS_PATH, ASSETS_PATH } from "@main/config/app";
import { shell } from "electron";
import { ipcMain } from "@main/typed-ipc";
import path from "path";
import { execSync, spawn, exec } from 'child_process';

const REPLAY_SERVICE_URL = "https://bar-rts.com/replays";
const NEWS_SERVICE_URL = "https://www.beyondallreason.info/news";

// Check for file managers in PATH
function hasFileManager() {
    const managers = ['nautilus', 'thunar', 'pcmanfm', 'dolphin', 'nemo'];
    return managers.some(cmd => {
        try {
            execSync(`command -v ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    });
}

// Detect if running in i3
function isI3Session() {
    try {
        const wm = execSync('wmctrl -m', { encoding: 'utf8' });
        return wm.toLowerCase().includes('i3');
    } catch {
        try {
            const ps = execSync('ps -e', { encoding: 'utf8' });
            return ps.toLowerCase().includes('i3');
        } catch {
            return false;
        }
    }
}

function focusTerminal() {
    exec('i3-msg -t get_tree', (err, stdout) => {
        if (err) {
            console.error('Failed to get i3 tree:', err);
            return;
        }
        try {
            const tree = JSON.parse(stdout);

            // Recursive search for window whose title ends with /demos
            function findWindow(node) {
                if (node.window && typeof node.name === 'string') {
                    if (node.name.endsWith('/demos')) {
                        return node.window; // return window id
                    }
                }
                if (node.nodes) {
                    for (const child of node.nodes) {
                        const res = findWindow(child);
                        if (res) return res;
                    }
                }
                return null;
            }

            const winId = findWindow(tree);
            if (!winId) {
                console.error('No terminal window ending with /demos found');
                return;
            }

            // Focus by window ID
            exec(`i3-msg [id=${winId}] focus`, (error) => {
                if (error) console.error('Failed to focus window:', error);
            });
        } catch (e) {
            console.error('Failed to parse i3 tree JSON:', e);
        }
    });
}


// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function openInBrowser(url: string) {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return;

    // Additional checks to prevent opening arbitrary URLs
    if (![REPLAY_SERVICE_URL, NEWS_SERVICE_URL].some((serviceUrl) => url.startsWith(serviceUrl))) return;
    shell.openExternal(url);
}

function registerIpcHandlers() {
    ipcMain.handle("shell:openStateDir", () => shell.openPath(STATE_PATH));
    ipcMain.handle("shell:openAssetsDir", () => shell.openPath(ASSETS_PATH));
    ipcMain.handle("shell:openSettingsFile", () => shell.openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => shell.openPath(path.join(WRITE_DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => {
        const inI3 = isI3Session();
        const hasFM = hasFileManager();

        console.log(inI3);
        console.log(hasFM);

        if (inI3 && !hasFM) {
            console.log("i3 without file manager detected — opening in terminal.");

            // Pick your preferred terminal here
            const terminal = 'alacritty'; // could be 'gnome-terminal', 'kitty', etc.

            // Spawn terminal in detached mode
            const child = spawn(terminal, ['--working-directory', REPLAYS_PATH], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            setTimeout(() => {
                focusTerminal();
            }, 1500);

            return REPLAYS_PATH;
        }

        // Normal case: open using Electron shell (non-blocking)
        shell.openPath(REPLAYS_PATH)
            .then(result => {
                if (result) console.error("Failed to open path:", result);
            })
            .catch(err => {
                console.error("Error opening path:", err);
            });
        return REPLAYS_PATH;
    });
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
