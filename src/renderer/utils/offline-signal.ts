// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";

// Raised when the user chooses to go offline, as opposed to the socket dropping
// on its own. Each store registers its own cleanup here rather than the
// connection logic importing every store.
export const onWentOffline = new Signal<void>();
