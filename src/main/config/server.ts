// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { settingsService } from "@main/services/settings.service";

export const OAUTH_CLIENT_ID = "generic_lobby";
export const OAUTH_SCOPE = "tachyon.lobby";

function getLobbyServer() {
    return settingsService.getSettings().lobbyServer;
}

function getOAuthAuthorizationServerURL() {
    const server = getLobbyServer();
    let url: URL;
    if (server.startsWith("ws://")) {
        url = new URL("http://" + server.slice("ws://".length));
    } else if (server.startsWith("wss://")) {
        url = new URL("https://" + server.slice("wss://".length));
    } else if (server.startsWith("http://") || server.startsWith("https://")) {
        url = new URL(server);
    } else {
        url = new URL("https://" + server);
    }
    return url.origin;
}

function getOAuthWellKnownURL() {
    return `${getOAuthAuthorizationServerURL()}/.well-known/oauth-authorization-server`;
}

function getWSServerURL() {
    const server = getLobbyServer();
    let url: URL;
    if (server.startsWith("http://")) {
        url = new URL("ws://" + server.slice("http://".length));
    } else if (server.startsWith("https://")) {
        url = new URL("wss://" + server.slice("https://".length));
    } else if (server.startsWith("ws://") || server.startsWith("wss://")) {
        url = new URL(server);
    } else {
        url = new URL("wss://" + server);
    }

    if (!url.pathname.endsWith("/tachyon")) {
        url.pathname = url.pathname.replace(/\/?$/, "/tachyon");
    }
    return url.toString();
}

export { getOAuthAuthorizationServerURL, getOAuthWellKnownURL, getWSServerURL };
