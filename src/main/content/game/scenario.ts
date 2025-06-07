// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export type Scenario = {
    index: number;
    scenarioid: string;
    version: string;
    title: string;
    author: string;
    isnew: boolean;
    imagepath: string;
    imageflavor: string;
    summary: string;
    briefing: string;
    mapfilename: string;
    playerstartx: string;
    playerstarty: string;
    partime: number;
    parresources: number;
    difficulty: number;
    defaultdifficulty: string;
    difficulties: Array<{
        name: string;
        playerhandicap: number;
        enemyhandicap: number;
    }>;
    allowedsides: string[];
    victorycondition: string;
    losscondition: string;
    unitlimits: Record<string, number>;
    scenariooptions: {
        scenarioid: string;
        disablefactionpicker: boolean;
        unitloadout: Array<{
            name: string;
            x: number;
            y: number;
            z: number;
            rot: number;
            team: number;
            neutral?: boolean;
        }>;
    };
    startscript: string;
};
