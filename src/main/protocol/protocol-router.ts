// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";

const log = logger("protocol/router.ts");

export const PROTOCOL_SCHEME = "barrts";
const PROTOCOL = `${PROTOCOL_SCHEME}:`;

type ProtocolActionHandler = (url: URL, webContents: BarIpcWebContents) => void | Promise<void>;

const actionHandlerMap = new Map<string, ProtocolActionHandler>();

function parseProtocolParts(url: URL): { handler: string; action: string } | null {
    const handler = url.hostname;
    const action = url.pathname.slice(1);
    if (!handler || !action) return null;
    return { handler, action };
}

export function registerProtocolAction(handler: string, action: string, fn: ProtocolActionHandler): void {
    actionHandlerMap.set(`${handler}/${action}`, fn);
}

export function extractProtocolUrl(argv: string[]): string | undefined {
    return argv.find((arg) => arg.startsWith(PROTOCOL + "//"));
}

export function routeProtocolUrl(rawUrl: string, webContents: BarIpcWebContents): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        log.warn(`Invalid protocol URL: ${rawUrl}`);
        return;
    }

    if (parsedUrl.protocol !== PROTOCOL) return;

    const parts = parseProtocolParts(parsedUrl);
    if (!parts) {
        log.warn(`Malformed protocol URL: ${rawUrl}`);
        return;
    }

    const key = `${parts.handler}/${parts.action}`;
    const fn = actionHandlerMap.get(key);

    if (!fn) {
        log.warn(`No action registered for ${PROTOCOL_SCHEME}://${key}`);
        return;
    }

    log.info(`Routing: ${rawUrl}`);

    Promise.resolve(fn(parsedUrl, webContents)).catch((err) => {
        log.error(`Action "${key}" threw:`, err);
    });
}
