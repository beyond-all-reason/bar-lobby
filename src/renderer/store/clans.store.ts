// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ClanBaseData } from "@renderer/model/clan";
import { reactive } from "vue";

// Placeholder entry for "No Clan"
const noClanEntry: ClanBaseData[] = [
    {
        clanId: "0",
        name: "No Clan",
        tag: "NC",
    },
];
// Reactive store for clans data
// This store holds the base data for all clans
// If no clans are available, it contains a placeholder entry
export const clansStore = reactive<{
    clansBaseData: (ClanBaseData | null)[];
}>({
    clansBaseData: noClanEntry,
});

// Function to read all clans from the server
async function readAllClansFromServer() {
    console.log("readAllClansFromServer called...");
    try {
        const response = await window.tachyon.request("clan/viewList");
        clansStore.clansBaseData = response.data.clansBaseData;
    } catch {
        console.log("Reading clans from server failed.");
    }
}

// Function to read one full clan data from the server by clan ID
async function readClanFromServer(clanId: string) {
    console.log(`readClanFromServer called for clanId: ${clanId}`);
    try {
        const response = await window.tachyon.request("clan/view", { clanId: String(clanId) });
        return response.data;
    } catch {
        console.log(`Reading clan ${clanId} from server failed.`);
        return null;
    }
}

// Exporting clan-related functions
export const clanfuncs = { readAllClansFromServer: readAllClansFromServer, readClanFromServer: readClanFromServer };
