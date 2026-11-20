// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { tachyonMeta } from "tachyon-protocol";

// WebSocket subprotocol per the Tachyon connection spec: `v<major>.<minor>.tachyon`,
// derived from the tachyon-protocol package version this client was built against.
export function getTachyonSubprotocol(version: string = tachyonMeta.version): string {
    const [major, minor] = version.split(".");
    return `v${major}.${minor}.tachyon`;
}
