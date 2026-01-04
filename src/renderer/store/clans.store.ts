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

// Exporting clan-related functions
export const clanfuncs = { readAllClansFromServer: readAllClansFromServer };
