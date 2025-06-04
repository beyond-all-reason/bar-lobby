// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

export const accountSchema = Type.Object({
    email: Type.String({ default: "" }),
    token: Type.String({ default: "" }),
});
