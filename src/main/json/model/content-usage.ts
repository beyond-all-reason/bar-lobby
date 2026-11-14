// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

// type is a plain string rather than a union of the known content types on purpose: a file written by
// a version that knew about a type this one does not must still validate, otherwise the whole record
// is rejected and every timestamp in it is lost.
const contentRef = Type.Object({
    type: Type.String(),
    id: Type.String(),
});

export const contentUsageSchema = Type.Object({
    usage: Type.Array(Type.Composite([contentRef, Type.Object({ lastUsed: Type.String() })]), { default: [] }),
});
