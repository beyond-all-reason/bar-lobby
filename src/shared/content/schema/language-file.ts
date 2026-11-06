// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

export interface LanguageTable {
    [key: string]: string | LanguageTable;
}

// Written out by hand because a recursive TypeBox type refers to itself by an `$id` of its own, and the
// exported copy has to stand alone. `#` is the root of whichever file this ends up in.
export const LanguageFile = Type.Unsafe<LanguageTable>({
    type: "object",
    additionalProperties: {
        anyOf: [{ type: "string" }, { $ref: "#" }],
    },
    title: "Content language file",
    description: "language/<locale>.json: translated text for content, such as en.json or fr.json. Keys may be nested objects or flat dotted keys, and `a.b` finds the same text either way.",
});
