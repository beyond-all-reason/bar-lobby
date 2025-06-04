// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

export const accountSchema = Type.Object({
    token: Type.String({ default: "" }),
    refreshToken: Type.String({ default: "" }),
});
