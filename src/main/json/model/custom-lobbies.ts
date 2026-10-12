// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

import { DEFAULT_LOBBY_LIST_QUERY, lobbyListQuerySchema } from "@shared/lobby-list-query";

// Separate from settings.json, since an invalid file is discarded whole and the query is the part
// most likely to change shape.
export const customLobbiesSchema = Type.Object({
    query: Type.Object(lobbyListQuerySchema.properties, { default: DEFAULT_LOBBY_LIST_QUERY }),
    // Server the saved tags came from; tags are server-specific.
    tagsServer: Type.String({ default: "" }),
    autoRefresh: Type.Boolean({ default: false }),
});
