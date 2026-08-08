// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";

// Raised when the user chooses to go offline, as opposed to the socket dropping
// on its own. It lives here rather than on tachyon.store so that each store can
// register its own cleanup: having tachyon.store call into them instead means
// importing lobby.store, and that reaches battle.store while game.store is still
// evaluating.
export const onWentOffline = new Signal<void>();
