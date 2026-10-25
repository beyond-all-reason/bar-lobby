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

// TODO: Remove the backward compatibility for the `ip` field once the server is updated to Tachyon 1.24.0
// @ts-expect-error ip is not part of SpringConnectionDetails but is used for backward server compatibility
export function createSpringString({ ip, ips, port, username, password }: SpringConnectionDetails): string {
    let effectiveIp: string = "";
    if (!ips || ips.length === 0) {
        if (ip) {
            effectiveIp = ip;
        } else throw new Error("No IPs provided for SpringString connection");
    } else {
        effectiveIp = ips[0];
    }
    // We only use the first provided IP for now, it will typically be the only one provided.
    return `spring://${username}:${password}@${effectiveIp}:${port}`;
}
