// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";

// Raised when the Tachyon connection comes up. It lives here rather than on
// tachyon.store so that each store can react on its own: having tachyon.store
// call into them instead means importing chat.store, which reaches lobby.store
// and me.store, both of which import tachyon.store back.
export const onTachyonConnected = new Signal<void>();
