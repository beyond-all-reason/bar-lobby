// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const networkApi = {
    onOffline: (handler: () => void) => window.addEventListener("offline", handler),
};
