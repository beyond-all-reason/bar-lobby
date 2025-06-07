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
    const url = `https://${getLobbyServer()}`;
    return url;
}

function getOAuthWellKnownURL() {
    const url = `${getOAuthAuthorizationServerURL()}/.well-known/oauth-authorization-server`;
    return url;
}

function getWSServerURL() {
    const url = `wss://${getLobbyServer()}/tachyon`;
    return url;
}

export { getOAuthAuthorizationServerURL, getOAuthWellKnownURL, getWSServerURL };
