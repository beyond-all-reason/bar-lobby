// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// The override only applies when the default is not being used, and an empty one
// means none is set. Otherwise the first default is used.
export function resolveLobbyServer(useDefault: boolean, override: string, defaultServers: readonly string[]): string {
    return (!useDefault && override) || defaultServers[0];
}

// Run once both are loaded, since a new config can add or drop default servers. A custom server that
// became a default is listed once, as a default, and an override left behind by a dropped default
// becomes a custom server so it stays selectable.
export function reconcileCustomServers(override: string, customServers: readonly string[], defaultServers: readonly string[]): string[] {
    const reconciled = [...new Set(customServers)].filter((server) => !defaultServers.includes(server));
    if (override && !defaultServers.includes(override) && !reconciled.includes(override)) {
        reconciled.push(override);
    }
    return reconciled;
}
