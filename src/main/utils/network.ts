// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { net } from "electron";

export const network = {
    isOnline: () => net.isOnline(),
};
