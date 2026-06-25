// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const LOBBY_PROTOCOL_SCHEME = "barrts";
export const LOBBY_PROTOCOL = `${LOBBY_PROTOCOL_SCHEME}:`;
export const LOBBY_PROTOCOL_PREFIX = `${LOBBY_PROTOCOL}//`;

// The external service must hand off GET /<handler>/<action>?params
// to barrts://<handler>/<action>?params.
export const LOBBY_SHAREABLE_BASE_URL = "https://bar.gg";
