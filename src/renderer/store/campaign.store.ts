// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { CampaignModel } from "@renderer/model/campaign";

import armadaIcon from "/src/renderer/assets/images/factions/armada_faction.png?url";
import cortexIcon from "/src/renderer/assets/images/factions/cortex_faction.png?url";
//import unknownIcon from "/src/renderer/assets/images/factions/unknown_faction.png?url";
import armadaBackgroundImage from "/src/renderer/assets/images/backgrounds/BAR3-5K_Loadingscreen_1.jpg?url";
import cortexBackgroundImage from "/src/renderer/assets/images/backgrounds/BAR3-5K_Loadingscreen_2.jpg?url";
//import unknownBackgroundImage from "/src/renderer/assets/images/3.png?url";

export const campaignStore: {
    isInitialized: boolean;
    campaignsList: Map<string, CampaignModel>;
} = reactive({
    isInitialized: false,
    campaignsList: new Map(),
});

export async function initCampaignStore() {
    if (campaignStore.isInitialized) {
        console.warn("Campaign store is already initialized, skipping initialization.");
        return;
    }
    //TODO: Presumably the campaign info will eventually come via GameAPI, but until then we will have to do it locally
    // As a result, some basic campaign info is thrown into this store so we can get the UI/navigation functional.
    // Note, however, that "unlocked" status is going to need to be saved locally.
    // We will probably want a versioning system too, because changes to campaigns will impact
    // our ability to load a saved game.
    campaignStore.campaignsList
        .set("a", {
            campaignId: "a",
            title: "Test Campaign 1 - Armada",
            description: "This is a description field meant to hold longer string content.",
            unlocked: true,
            logo: armadaIcon,
            backgroundImage: armadaBackgroundImage,
            missions: new Map(),
        })
        .set("b", {
            campaignId: "b",
            title: "Test Campaign 2 - Cortex",
            description: "This is a description field meant to hold longer string content.",
            unlocked: false,
            logo: cortexIcon,
            backgroundImage: cortexBackgroundImage,
            missions: new Map(),
        });
    campaignStore.campaignsList
        .get("a")
        ?.missions.set("1", {
            campaignId: "a",
            missionId: "1",
            title: "Mission Title 1",
            description: "This is a mission description, which is a longer amount of text for the briefing and other information.",
            images: [],
            mapName: "Ancient Bastion Remake 0.5",
            startPos: {
                x: 0.25,
                y: 0.25,
            },
            unlocked: true,
        })
        .set("2", {
            campaignId: "a",
            missionId: "2",
            title: "Mission Title 2",
            description: "This is a mission description, which is a longer amount of text for the briefing and other information.",
            images: [],
            mapName: "Requiem Outpost 1.0.1",
            startPos: {
                x: 0.25,
                y: 0.25,
            },
            unlocked: true,
        })
        .set("3", {
            campaignId: "a",
            missionId: "3",
            title: "Mission Title 3",
            description: "This is a mission description also.",
            images: [],
            mapName: "Invalid Map Name",
            startPos: {
                x: 0.25,
                y: 0.25,
            },
            unlocked: false,
        });
}
