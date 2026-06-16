// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const LOBBY_PROTOCOL_SCHEME = "barrts";

// TODO: When an external redirect service is available (e.g. bar.gg):
//   1. Replace this URL with the external service base URL
//   2. Remove lobbyHttpBridgeService registration from main.ts
//   3. Delete src/main/services/lobby-http-bridge.service.ts
//   The external service must redirect GET /<handler>/<action>?params to barrts://<handler>/<action>?params
export const LOBBY_SHAREABLE_BASE_URL = "http://localhost:47777";
