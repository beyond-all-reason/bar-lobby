// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";

const log = logger("protocol/router.ts");

import { LOBBY_PROTOCOL_SCHEME } from "./scheme";

const LOBBY_PROTOCOL = `${LOBBY_PROTOCOL_SCHEME}:`;

type LobbyProtocolActionHandler = (url: URL, webContents: BarIpcWebContents) => void | Promise<void>;

interface LobbyProtocolActionOptions {
    label?: string;
}

const actionHandlerMap = new Map<string, LobbyProtocolActionHandler>();
const labelMap = new Map<string, string>();

function parseProtocolParts(url: URL): { handler: string; action: string } | null {
    const handler = url.hostname;
    const action = url.pathname.slice(1);
    if (!handler || !action) return null;
    return { handler, action };
}

export function registerLobbyProtocolAction(handler: string, action: string, fn: LobbyProtocolActionHandler, options?: LobbyProtocolActionOptions): void {
    const key = `${handler}/${action}`;
    actionHandlerMap.set(key, fn);
    if (options?.label) {
        labelMap.set(key, options.label);
    }
}

export function getLobbyProtocolLabels(): Record<string, string> {
    return Object.fromEntries(labelMap);
}

export function buildLobbyProtocolUrl(handler: string, action: string, queryString = ""): string {
    return `${LOBBY_PROTOCOL_SCHEME}://${handler}/${action}${queryString}`;
}

export function extractLobbyProtocolUrl(argv: string[]): string | undefined {
    return argv.find((arg) => arg.startsWith(LOBBY_PROTOCOL + "//"));
}

export function routeLobbyProtocolUrl(rawUrl: string, webContents: BarIpcWebContents): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        log.warn(`Invalid protocol URL: ${rawUrl}`);
        return;
    }

    if (parsedUrl.protocol !== LOBBY_PROTOCOL) return;

    const parts = parseProtocolParts(parsedUrl);
    if (!parts) {
        log.warn(`Malformed protocol URL: ${rawUrl}`);
        return;
    }

    const key = `${parts.handler}/${parts.action}`;
    const fn = actionHandlerMap.get(key);

    if (!fn) {
        log.warn(`No action registered for ${LOBBY_PROTOCOL_SCHEME}://${key}`);
        return;
    }

    log.info(`Routing: ${rawUrl}`);

    Promise.resolve(fn(parsedUrl, webContents)).catch((err) => {
        log.error(`Action "${key}" threw:`, err);
    });
}
