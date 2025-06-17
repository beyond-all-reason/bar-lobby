// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { settingsService } from "@main/services/settings.service";

export const OAUTH_CLIENT_ID = "generic_lobby";
export const OAUTH_SCOPE = "tachyon.lobby";

function getLobbyServer() {
    return settingsService.getSettings().lobbyServer;
}

function isSecure(url) {
    return url.protocol == "https:" || url.protocol == "wss:";
}

function getOAuthAuthorizationServerURL() {
    const server = getLobbyServer();
    const url = new URL(server.includes("://") ? server : `https://${server}`);

    if (isSecure(url)) {
        url.protocol = "https:";
    } else {
        url.protocol = "http:";
    }

    return url.origin;
}

function getOAuthWellKnownURL() {
    return `${getOAuthAuthorizationServerURL()}/.well-known/oauth-authorization-server`;
}

function getWSServerURL() {
    const server = getLobbyServer();
    const url = new URL(server.includes("://") ? server : `wss://${server}`);

    if (isSecure(url)) {
        url.protocol = "wss:";
    } else {
        url.protocol = "ws:";
    }

    url.pathname = "/tachyon";

    return url.toString();
}

export { getOAuthAuthorizationServerURL, getOAuthWellKnownURL, getWSServerURL };
