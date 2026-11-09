// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Me } from "@main/model/user";
import { reactive, readonly } from "vue";

const state = reactive<Me>({
    userId: "0",
    clanId: null,
    partyId: null,
    countryCode: "",
    displayName: "",
    status: "offline",
    username: "Player",
    battleRoomState: {},
    outgoingFriendRequestUserIds: new Set<string>(),
    incomingFriendRequestUserIds: new Set<string>(),
    friendUserIds: new Set<string>(),
    ignoreUserIds: new Set<string>(),
    permissions: new Set<string>(),
});

export const me = readonly(state);

export const meActions = {
    assign(changes: object) {
        Object.assign(state, changes);
    },
    setFriends(friendUserIds: Iterable<string>, outgoingRequestUserIds: Iterable<string>, incomingRequestUserIds: Iterable<string>) {
        state.friendUserIds = new Set(friendUserIds);
        state.outgoingFriendRequestUserIds = new Set(outgoingRequestUserIds);
        state.incomingFriendRequestUserIds = new Set(incomingRequestUserIds);
    },
    addFriend(userId: string) {
        state.friendUserIds.add(userId);
    },
    removeFriend(userId: string) {
        state.friendUserIds.delete(userId);
    },
    addOutgoingRequest(userId: string) {
        state.outgoingFriendRequestUserIds.add(userId);
    },
    removeOutgoingRequest(userId: string) {
        state.outgoingFriendRequestUserIds.delete(userId);
    },
    addIncomingRequest(userId: string) {
        state.incomingFriendRequestUserIds.add(userId);
    },
    removeIncomingRequest(userId: string) {
        state.incomingFriendRequestUserIds.delete(userId);
    },
    setBattleRoomState(changes: Me["battleRoomState"]) {
        Object.assign(state.battleRoomState, changes);
    },
    clearBattleTeam() {
        delete state.battleRoomState.teamId;
    },
};
