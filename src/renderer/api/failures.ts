// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { IpcCallError } from "@renderer/api/ipc-call";
import { isTachyonError } from "@renderer/api/tachyon";

export function isApiFailure(error: unknown) {
    return isTachyonError(error) || error instanceof IpcCallError;
}
