// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export type ContentType = "engine" | "game" | "map";

// The id is whatever that type of content is named by upstream: an engine version, a game springname
// or rapid tag, a map springname. It matches how tachyon describes queue assets.
export type ContentRef = {
    type: ContentType;
    id: string;
};

export function contentRefKey(ref: ContentRef) {
    return `${ref.type}:${ref.id}`;
}
