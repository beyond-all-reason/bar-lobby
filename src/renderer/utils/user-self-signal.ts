// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { PartyState, PrivateUser, PrivateBattle } from "tachyon-protocol/types";

// We do not use PrivateUser["party"] to prevent null values in the dispatch
export const onUserSelfPartySignal = new Signal<PartyState[]>();

// Value provided in the string is the lobby ID.
export const onUserSelfLobbySignal = new Signal<string>();

export const onUserSelfMatchmakingSignal = new Signal<PrivateUser["matchmaking"]>();

export const onUserSelfBattleSignal = new Signal<PrivateBattle>();

// Raised when the self user's status moves away from "playing", regardless of
// what it changed to.
export const onUserStoppedPlayingSignal = new Signal<void>();
