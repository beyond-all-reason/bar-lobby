// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type, Static } from "@sinclair/typebox";

// A stub until credits are scoped: the client only checks the file is there and holds strings.
export const Credits = Type.Array(Type.String({ title: "Credit", description: "One line of the credits." }), {
    title: "Campaign credits",
    description: "credits.json in a campaign folder: the campaign's credits, one line per entry.",
});

export type Credits = Static<typeof Credits>;
