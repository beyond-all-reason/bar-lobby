// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// Errors thrown in main arrive in the renderer stripped of everything but a message, so failures a
// caller needs to act on have to travel as data instead. Mirrors the shape tachyon-protocol uses for
// its own responses, which can't be reused here because it's keyed on tachyon command ids.
// `reason` is a stable code to branch on or translate; `details` carries any raw text behind it.
export type IpcResult<T = void> = { status: "success"; data: T } | { status: "failed"; reason: string; details?: string };
