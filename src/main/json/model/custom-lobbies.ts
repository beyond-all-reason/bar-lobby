// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

import { DEFAULT_LOBBY_LIST_QUERY, lobbyListQuerySchema } from "@shared/lobby-list-query";

// Kept out of settings.json: an invalid file is thrown away whole, and the query is the part most
// likely to change shape, so a bad one should only cost the user their lobby list preferences.
export const customLobbiesSchema = Type.Object({
    query: Type.Object(lobbyListQuerySchema.properties, { default: DEFAULT_LOBBY_LIST_QUERY }),
    // The server the selected lobby tags were chosen on. Tags come from the server, so they mean nothing on another one.
    tagsServer: Type.String({ default: "" }),
    autoRefresh: Type.Boolean({ default: false }),
});
