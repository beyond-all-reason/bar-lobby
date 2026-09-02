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
    if (ips.length === 0) {
        if (ip) {
            //Temporary guard because server needs to update to Tachyon 1.24.0
            ips.push(ip);
        } else {
            throw new Error("No IPs provided for SpringString connection");
        }
    }
    // We only use the first provided IP for now, it will typically be the only one provided.
    return `spring://${username}:${password}@${ips[0]}:${port}`;
}
