// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { shell } from "electron";
import { logger } from "@main/utils/logger";

const log = logger("lobby-protocol-launch.service.ts");

async function openExternal(url: string): Promise<boolean> {
    try {
        await shell.openExternal(url);
        return true;
    } catch (err) {
        log.warn(`Failed to open protocol URL ${url}: ${err}`);
        return false;
    }
}

export const lobbyProtocolLaunchService = {
    openExternal,
};
