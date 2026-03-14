// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

//import { ClanBaseData } from "@renderer/model/clan";
import { reactive, toRaw } from "vue";
import { ClanBaseData, ClanId, ClanUpdateableData, ClanMember, ClanCreateRequestData } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";

// Placeholder entry for "No Clan"
const noClanEntry: ClanBaseData[] = [
    {
        name: "No Clan",
        tag: "NC",
        clanId: "0",
        language: "en",
    },
];
// Reactive store for clans data
// This store holds the base data for all clans
// If no clans are available, it contains a placeholder entry
export const clansStore = reactive<{
    clanList: ClanBaseData[];
}>({
    clanList: noClanEntry,
});

export const oneClanStore = reactive<{
    clanId: ClanId;
    clanUpdateableData: ClanUpdateableData;
    members: ClanMember;
}>;

async function createClan(data: ClanCreateRequestData): Promise<boolean> {
    console.log("Create clan...", JSON.stringify(data, null, 2));
    try {
        const response = await window.tachyon.request("clan/create", toRaw(data));
        console.log("Tachyon: clan/create", response);
        return true;
    } catch (error) {
        console.log("Creating clan failed.", error);
        notificationsApi.alert({ text: "Tachyon error with clan/create", severity: "error" });
        return false;
    }
}

// Function to read all clans from the server
async function readAllClansFromServer() {
    console.log("readAllClansFromServer called...");
    try {
        const response = await window.tachyon.request("clan/viewList");
        clansStore.clanList = response.data.clanList;
        // console.log(`Response.data.clanList=${response.data.clanList}`);
    } catch {
        console.log("Reading clans from server failed.");
    }
}

// Function to read one full clan data from the server by clan ID
async function readClanFromServer(clanId: string) {
    console.log(`readClanFromServer called for clanId: ${clanId}`);
    try {
        const response = await window.tachyon.request("clan/view", { clanId: String(clanId) });
        console.log(`Response.data.name=${response.data.name}`);
        console.log(`Response.data.tag=${response.data.tag}`);
        console.log(`Response.data.description=${response.data.description}`);
        console.log(`Response.data.language=${response.data.language}`);
        console.log(`Response.data.members.length=${response.data.members.length}`);
        return response.data;
    } catch {
        console.log(`Reading clan ${clanId} from server failed.`);
        return null;
    }
}

async function leaveClan(clanId: string) {
    console.log("Leave clan with clanId:", clanId);
    try {
        const response = await window.tachyon.request("clan/leave");
        console.log("Tachyon: clan/leave", response);
        return true;
    } catch (error) {
        console.log(`Leaving clan ${clanId} failed:`, error);
        return false;
    }
}

// Exporting clan-related functions
export const clanfuncs = { readAllClansFromServer: readAllClansFromServer, readClanFromServer: readClanFromServer, createClan: createClan, leaveClan: leaveClan };
