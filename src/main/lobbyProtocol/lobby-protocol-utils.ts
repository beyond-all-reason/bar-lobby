// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { logger } from "@main/utils/logger";
import { APP_NAME } from "@main/config/app";
import { LOBBY_PROTOCOL_SCHEME } from "./scheme";

const log = logger("lobbyProtocol/lobby-protocol-utils.ts");

/**
 * Linux: app.setAsDefaultProtocolClient relies on xdg-settings which is broken
 * on many desktop environments (Xfce, some GNOME/Wayland setups). We create a
 * .desktop file manually and register it via xdg-mime — works in both dev mode
 * and packaged AppImage. For .deb/.rpm this is redundant (electron-builder + package
 * manager handle it), but harmless.
 */
function registerLinux(): boolean {
    try {
        const appsDir = path.join(os.homedir(), ".local", "share", "applications");
        const desktopFileName = `${LOBBY_PROTOCOL_SCHEME}-bar-lobby.desktop`;
        const desktopFilePath = path.join(appsDir, desktopFileName);

        const content = [
            "[Desktop Entry]",
            `Name=${APP_NAME}`,
            // Quotes handle spaces in paths; %u is the URI placeholder per freedesktop spec
            `Exec="${process.execPath}" "${app.getAppPath()}" %u`,
            "Type=Application",
            "NoDisplay=true",
            `MimeType=x-scheme-handler/${LOBBY_PROTOCOL_SCHEME};`,
        ].join("\n") + "\n";

        fs.mkdirSync(appsDir, { recursive: true });
        fs.writeFileSync(desktopFilePath, content, "utf8");
        execFileSync("update-desktop-database", [appsDir]);
        execFileSync("xdg-mime", ["default", desktopFileName, `x-scheme-handler/${LOBBY_PROTOCOL_SCHEME}`]);
        return true;
    } catch (err) {
        log.warn(`Linux protocol registration failed: ${err}`);
        return false;
    }
}

/**
 * Registers the lobby protocol handler for the current platform.
 *
 * - Linux (dev + packaged AppImage): manual .desktop file via xdg-mime
 * - Windows dev: setAsDefaultProtocolClient with explicit app path and "--" separator
 * - Windows/macOS packaged: setAsDefaultProtocolClient (electron-builder handles the rest)
 */
/**
 * Windows dev: electron.exe needs explicit app path so it knows which app to load,
 * plus "--" to prevent the protocol URL from being parsed as an Electron flag.
 * Windows packaged: electron-builder configured the protocol in the installer;
 * setAsDefaultProtocolClient registers it at runtime.
 */
function registerWindows(): boolean {
    if (!app.isPackaged) {
        return app.setAsDefaultProtocolClient(LOBBY_PROTOCOL_SCHEME, process.execPath, [app.getAppPath(), "--"]);
    }
    return app.setAsDefaultProtocolClient(LOBBY_PROTOCOL_SCHEME);
}

export function registerLobbyProtocol(): void {
    let success: boolean;

    if (process.platform === "linux") {
        success = registerLinux();
    } else {
        success = registerWindows();
    }

    if (success) {
        log.info(`Protocol ${LOBBY_PROTOCOL_SCHEME}:// registered successfully`);
    } else {
        log.warn(`Failed to register protocol ${LOBBY_PROTOCOL_SCHEME}://`);
    }
}
