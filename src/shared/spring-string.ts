// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export interface SpringConnectionDetails {
    ips: string[];
    port: number;
    username: string;
    password: string;
    battleId: string;
}

export function createSpringString({ ips, port, username, password }: SpringConnectionDetails): string {
    // Note, data.ips[string] values are either ipv4 or ipv6, but we only use the first (only) for now.
    return `spring://${username}:${password}@${ips[0]}:${port}`;
}
