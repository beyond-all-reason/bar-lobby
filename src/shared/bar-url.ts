// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// A local file as a bar:// URL, which the main process serves if it lies in an allowed folder.
// encodeURIComponent leaves ' ( ) ! * alone, and a ' would end a CSS url('...') early, so those are escaped too.
export function toBarUrl(filePath: string) {
    return `bar://${encodeURIComponent(filePath).replace(/['()!*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}
