// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { me } from "@renderer/store/me.store";
import {
    PartyInvitedEventData,
    PartyRemovedEventData,
    PartyUpdatedEventData,
    PartyId,
    PartyState,
    PartyAcceptInviteRequestData,
    PartyCancelInviteRequestData,
    PartyDeclineInviteRequestData,
    PartyInviteRequestData,
    PartyKickMemberRequestData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { notificationsApi } from "@renderer/api/notifications";

export enum PartyStatus {
    None = "None",
    InvitedOnly = "InvitedOnly",
    JoinedOnly = "Joined",
    JoinedAndInvited = "JoinedAndInvited",
}

export const partyStore: {
    isInitialized: boolean;
    partyId: PartyId | null; //Our active party
    parties: PartyState[]; //All parties (all invited, and up to one joined)
    state: PartyStatus;
} = reactive({
    isInitialized: false,
    partyId: null,
    parties: [],
    state: PartyStatus.None,
});

async function requestAcceptInvite(data: PartyAcceptInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/acceptInvite", data);
        console.log("Tachyon: party/acceptInvite response:", response);
        me.partyId = partyStore.partyId = data.partyId;
    } catch (error) {
        console.error("Tachyon error: party/acceptInvite:", error);
        notificationsApi.alert({ text: "Error with request party/acceptInvite", severity: "error" });
    }
}

async function requestCancelInvite(data: PartyCancelInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/cancelInvite", data);
        console.log("Tachyon: party/cancelInvite:", response);
    } catch (error) {
        console.error("Tachyon error: party/cancelInvite:", error);
        notificationsApi.alert({ text: "Error with request party/cancelInvite", severity: "error" });
    }
}

async function requestCreate() {
    try {
        const response = await window.tachyon.request("party/create");
        console.log("Tachyon: party/create:", response);
        partyStore.partyId = response.data.partyId;
    } catch (error) {
        console.error("Tachyon error: party/create:", error);
        notificationsApi.alert({ text: "Error with request party/create", severity: "error" });
    }
}

async function requestDeclineInvite(data: PartyDeclineInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/declineInvite", data);
        console.log("Tachyon: party/declineInvite:", response);
    } catch (error) {
        console.error("Tachyon error: party/declineInvite:", error);
        notificationsApi.alert({ text: "Error with request party/declineInvite", severity: "error" });
    }
}

async function requestInvite(data: PartyInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/invite", data);
        console.log("Tachyon: party/invite:", response);
    } catch (error) {
        console.error("Tachyon error: party/invite:", error);
        notificationsApi.alert({ text: "Error with request party/invite", severity: "error" });
    }
}

async function requestKickMember(data: PartyKickMemberRequestData) {
    try {
        const response = await window.tachyon.request("party/kickMember", data);
        console.log("Tachyon: party/kickMember:", response);
    } catch (error) {
        console.error("Tachyon error: party/kickMember:", error);
        notificationsApi.alert({ text: "Error with request party/kickMember", severity: "error" });
    }
}

async function requestLeave() {
    try {
        const response = await window.tachyon.request("party/leave");
        console.log("Tachyon: party/leave:", response);
    } catch (error) {
        console.error("Tachyon error: party/leave:", error);
        notificationsApi.alert({ text: "Error with request party/leave", severity: "error" });
    }
}

function onInvitedEvent(data: PartyInvitedEventData) {
    console.log("Tachyon: party/invited:", data);
}

function onRemovedEvent(data: PartyRemovedEventData) {
    console.log("Tachyon: party/removed:", data);
}

function onUpdatedEvent(data: PartyUpdatedEventData) {
    console.log("Tachyon: party/updated:", data);
}

export async function initPartyStore() {
    if (partyStore.isInitialized) return;

    window.tachyon.onEvent("party/invited", (data) => {
        onInvitedEvent(data);
    });

    window.tachyon.onEvent("party/removed", (data) => {
        onRemovedEvent(data);
    });
    window.tachyon.onEvent("party/updated", (data) => {
        onUpdatedEvent(data);
    });

    partyStore.isInitialized = true;
}

export const party = { requestAcceptInvite, requestCancelInvite, requestCreate, requestDeclineInvite, requestInvite, requestKickMember, requestLeave };
