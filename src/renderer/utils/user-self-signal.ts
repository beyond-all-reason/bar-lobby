// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { PartyState, PrivateUser, PrivateBattle } from "tachyon-protocol/types";

// TODO: have each of the appropriate stores connect to these signals and resync the client state appropriately.
export const onUserSelfPartySignal = new Signal<PartyState>();
export const onUserSelfLobbySignal = new Signal<PrivateUser["currentLobby"]>();
export const onUserSelfMatchmakingSignal = new Signal<PrivateUser["matchmaking"]>();
export const onUserSelfBattleSignal = new Signal<PrivateBattle>();
