// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

export const accountSchema = Type.Object({
    token: Type.String({ default: "" }),
    refreshToken: Type.String({ default: "" }),
    // Access tokens are opaque to us, so their lifetime has to be recorded here
    // rather than read back out of the token.
    expiresAt: Type.Number({ default: 0 }),
    encrypted: Type.Boolean({ default: false }),
});
