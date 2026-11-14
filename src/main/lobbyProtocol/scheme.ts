// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const LOBBY_PROTOCOL_SCHEME = "barrts";
export const LOBBY_PROTOCOL = `${LOBBY_PROTOCOL_SCHEME}:`;
export const LOBBY_PROTOCOL_PREFIX = `${LOBBY_PROTOCOL}//`;

// The external link service must map GET /<handler>/<action>?params
// to barrts://<handler>/<action>?params.
export const LOBBY_SHAREABLE_BASE_URL = "https://bar.devopsowy.pl";

export type LobbyProtocolParams = Record<string, string>;

function buildLobbyUrl(base: string, handler: string, action: string, params?: LobbyProtocolParams): URL {
    const url = new URL(`${base}/${handler}/${action}`);
    for (const [key, value] of Object.entries(params ?? {})) {
        url.searchParams.set(key, value);
    }
    return url;
}

export function buildLobbyProtocolUrl(handler: string, action: string, params?: LobbyProtocolParams): URL {
    return buildLobbyUrl(LOBBY_PROTOCOL_PREFIX.slice(0, -1), handler, action, params);
}

export function buildLobbyShareableUrl(handler: string, action: string, params?: LobbyProtocolParams): URL {
    return buildLobbyUrl(LOBBY_SHAREABLE_BASE_URL, handler, action, params);
}
