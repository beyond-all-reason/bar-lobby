// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { AuthApi } from "@preload/preload";

// Not through ipcCall: the sign-in screen shows login failures as main sent them.
export const authApi = {
    login: (interactive?: boolean) => window.auth.login(interactive),
    logout: () => window.auth.logout(),
    hasCredentials: () => window.auth.hasCredentials(),
    getState: () => window.auth.getState(),
    onChanged: (handler: Parameters<AuthApi["onChanged"]>[0]) => window.auth.onChanged(handler),
};
