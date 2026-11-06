// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";
import type { AuthApi } from "@preload/preload";

export const authApi = {
    login: (interactive?: boolean) => ipcCall("auth:login", () => window.auth.login(interactive)),
    logout: () => ipcCall("auth:logout", () => window.auth.logout()),
    hasCredentials: () => ipcCall("auth:hasCredentials", () => window.auth.hasCredentials()),
    getState: () => ipcCall("auth:state", () => window.auth.getState()),
    onChanged: (handler: Parameters<AuthApi["onChanged"]>[0]) => window.auth.onChanged(handler),
};
