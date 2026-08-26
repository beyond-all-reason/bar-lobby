// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/*
 * This file contains signals that are raised upon receiving the 'user/self' event from the server.
 * Most need to handle null/undefined values because the user may have been removed from the lobby/etc while disconnected.
 */

import { Signal } from "$/jaz-ts-utils/signal";
import { PartyState, PrivateUser } from "tachyon-protocol/types";

// This is a combination of PrivateUser["party"] and PrivateUser["invitedToParties"] which is parsed together for overall party state.
export const onUserSelfPartySignal = new Signal<PartyState[]>();

export const onUserSelfLobbySignal = new Signal<PrivateUser["currentLobby"]>();

export const onUserSelfMatchmakingSignal = new Signal<PrivateUser["matchmaking"]>();

export const onUserSelfBattleSignal = new Signal<PrivateUser["currentBattle"]>();
