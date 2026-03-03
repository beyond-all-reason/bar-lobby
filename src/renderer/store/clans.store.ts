// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

//import { ClanBaseData } from "@renderer/model/clan";
import { reactive } from "vue";
import { ClanBaseData, ClanId, ClanUpdateableData, ClanMember } from "tachyon-protocol/types";

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
        console.log(`Response.data.members=${response.data.members}`);
        return response.data;
    } catch {
        console.log(`Reading clan ${clanId} from server failed.`);
        return null;
    }
}

// Exporting clan-related functions
export const clanfuncs = { readAllClansFromServer: readAllClansFromServer, readClanFromServer: readClanFromServer };
