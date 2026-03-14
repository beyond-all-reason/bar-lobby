// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MissionModel } from "@renderer/model/mission";

//TODO: the logo and backgroundImage properties could end up being different types as stored images in memory?
//TODO: will we have branching/parallel mission paths?
export type CampaignModel = {
    campaignId: string;
    title: string;
    description: string;
    unlocked: boolean;
    logo: string | null;
    backgroundImage: string | null;
    missions: Map<string, MissionModel>;
};
