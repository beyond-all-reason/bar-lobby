// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

//TODO: the images could end up being different types as stored images in memory?
//TODO: find out what startscript options need to be included in here or not
export type MissionModel = {
    campaignId: string; // campaigns have an array of missions, is this redundant?
    missionId: string;
    title: string;
    description: string;
    images: string[];
    mapName: string;
    startPos: {
        x: number;
        y: number;
    };
    unlocked: boolean;
};
