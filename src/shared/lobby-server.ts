// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// An empty override means none is set, and the first default is used.
export function resolveLobbyServer(override: string, defaultServers: readonly string[]): string {
    return override || defaultServers[0];
}
