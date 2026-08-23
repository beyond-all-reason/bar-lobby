// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export interface SpringConnectionDetails {
    ip: string;
    port: number;
    username: string;
    password: string;
}

export function createSpringString({ ip, port, username, password }: SpringConnectionDetails): string {
    return `spring://${username}:${password}@${ip}:${port}`;
}
