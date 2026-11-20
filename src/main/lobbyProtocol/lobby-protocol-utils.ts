// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { logger } from "@main/utils/logger";
import { APP_NAME, getLinuxApplicationsDir } from "@main/config/app";
import { LOBBY_PROTOCOL_PREFIX, LOBBY_PROTOCOL_SCHEME } from "./scheme";

const log = logger("lobbyProtocol/lobby-protocol-utils.ts");
const REGISTRATION_COMMAND_TIMEOUT_MS = 5000;

/**
 * Linux: app.setAsDefaultProtocolClient relies on xdg-settings which is broken
 * on many desktop environments (Xfce, some GNOME/Wayland setups). We create a
 * .desktop file manually and register it via xdg-mime — works in both dev mode
 * and packaged AppImage. For .deb/.rpm this is redundant (electron-builder + package
 * manager handle it), but harmless.
 */
async function execFileAsync(file: string, args: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        execFile(file, args, { timeout: REGISTRATION_COMMAND_TIMEOUT_MS, windowsHide: true }, (err, stdout, stderr) => {
            if (err) {
                if (stderr) {
                    log.warn(`${file} stderr: ${stderr}`);
                }
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}

function quoteDesktopExecArg(arg: string): string {
    return `"${arg.replace(/["\\`$]/g, "\\$&")}"`;
}

function buildLinuxDesktopExec(): string {
    if (app.isPackaged && process.env.APPIMAGE) {
        // In AppImage, process.execPath points to the temporary mounted runtime
        // under /tmp/.mount_*. APPIMAGE points to the real file the OS can reopen.
        // The mounted chrome-sandbox cannot be root:root 4755, so protocol launches
        // from .desktop need --no-sandbox to avoid aborting before URL handling.
        return `${quoteDesktopExecArg(process.env.APPIMAGE)} --no-sandbox %u`;
    }

    if (app.isPackaged) {
        return `${quoteDesktopExecArg(process.execPath)} %u`;
    }

    // Electron dev installs often do not have node_modules/electron/dist/chrome-sandbox
    // configured as root:root 4755. Without this switch, protocol launches via .desktop
    // can abort before the app receives the URL.
    return `${quoteDesktopExecArg(process.execPath)} --no-sandbox ${quoteDesktopExecArg(app.getAppPath())} %u`;
}

async function queryLinuxDefaultProtocolHandler(): Promise<string | null> {
    try {
        const stdout = await execFileAsync("xdg-mime", ["query", "default", `x-scheme-handler/${LOBBY_PROTOCOL_SCHEME}`]);
        return stdout.trim() || null;
    } catch (err) {
        log.warn(`xdg-mime query failed: ${err}`);
    }

    try {
        const stdout = await execFileAsync("gio", ["mime", `x-scheme-handler/${LOBBY_PROTOCOL_SCHEME}`]);
        const match = stdout.match(/Default application for .*?:\s*(.+)/);
        return match?.[1]?.trim() || null;
    } catch (err) {
        log.warn(`gio mime query failed: ${err}`);
    }

    return null;
}

async function registerLinux(): Promise<boolean> {
    try {
        const appsDir = getLinuxApplicationsDir();
        const desktopFileName = `${LOBBY_PROTOCOL_SCHEME}-bar-lobby.desktop`;
        const desktopFilePath = path.join(appsDir, desktopFileName);

        const content =
            [
                "[Desktop Entry]",
                `Name=${APP_NAME}`,
                // Quotes handle spaces in paths; %u is the URI placeholder per freedesktop spec
                `Exec=${buildLinuxDesktopExec()}`,
                "Type=Application",
                "NoDisplay=true",
                "Terminal=false",
                `MimeType=x-scheme-handler/${LOBBY_PROTOCOL_SCHEME};`,
            ].join("\n") + "\n";

        await mkdir(appsDir, { recursive: true });
        await writeFile(desktopFilePath, content, "utf8");
        log.info(`Wrote Linux protocol desktop entry: ${desktopFilePath}`);

        try {
            await execFileAsync("update-desktop-database", [appsDir]);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
                log.warn(`update-desktop-database failed: ${err}`);
            }
        }

        let registered = false;
        try {
            await execFileAsync("xdg-mime", ["default", desktopFileName, `x-scheme-handler/${LOBBY_PROTOCOL_SCHEME}`]);
            registered = true;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                log.warn("xdg-mime is not available on this system.");
            } else {
                log.warn(`xdg-mime failed: ${err}`);
            }
        }

        if (!registered) {
            try {
                await execFileAsync("gio", ["mime", `x-scheme-handler/${LOBBY_PROTOCOL_SCHEME}`, desktopFileName]);
                registered = true;
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                    log.warn("gio is not available on this system.");
                } else {
                    log.warn(`gio mime failed: ${err}`);
                }
            }
        }

        if (registered) {
            const currentHandler = await queryLinuxDefaultProtocolHandler();
            if (currentHandler === desktopFileName) {
                return true;
            }
            log.warn(`Protocol handler registration did not verify. Current handler: ${currentHandler ?? "<none>"}`);
        }

        log.warn("Falling back to Electron protocol registration on Linux.");
        return app.setAsDefaultProtocolClient(LOBBY_PROTOCOL_SCHEME);
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
    if (process.platform === "linux") {
        void registerLinux().then((success) => {
            if (success) {
                log.info(`Protocol ${LOBBY_PROTOCOL_PREFIX} registered successfully`);
            } else {
                log.warn(`Failed to register protocol ${LOBBY_PROTOCOL_PREFIX}`);
            }
        });
    } else {
        const success = registerWindows();
        if (success) {
            log.info(`Protocol ${LOBBY_PROTOCOL_PREFIX} registered successfully`);
        } else {
            log.warn(`Failed to register protocol ${LOBBY_PROTOCOL_PREFIX}`);
        }
    }
}
