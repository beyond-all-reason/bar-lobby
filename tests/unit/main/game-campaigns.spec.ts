// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SdpFile } from "@main/content/game/sdp";
import { getCampaigns } from "@main/content/game/game-campaigns";

const { getGameFilesMock, mkdirMock, writeFileMock, readFileMock } = vi.hoisted(() => ({
    getGameFilesMock: vi.fn(),
    mkdirMock: vi.fn().mockResolvedValue(undefined),
    writeFileMock: vi.fn().mockResolvedValue(undefined),
    readFileMock: vi.fn().mockResolvedValue(Buffer.from("")),
}));

vi.mock("@main/content/game/game-files", () => ({ getGameFiles: getGameFilesMock }));
vi.mock("@main/config/app", () => ({ CAMPAIGN_IMAGE_PATH: "/campaign-images" }));
vi.mock("@main/utils/logger", () => ({ logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock("fs", () => ({
    promises: {
        mkdir: mkdirMock,
        writeFile: writeFileMock,
        readFile: readFileMock,
    },
    default: {
        promises: {
            mkdir: mkdirMock,
            writeFile: writeFileMock,
            readFile: readFileMock,
        },
    },
}));

function sdpJson(fileName: string, value: unknown): SdpFile {
    return {
        fileName,
        archivePath: `/pool/${fileName}.gz`,
        crc32: "",
        filesizeBytes: 0,
        md5: "abcd",
        data: Buffer.from(JSON.stringify(value), "utf8"),
    };
}

function mission(id: string) {
    return {
        missionId: id,
        title: id,
        description: `${id} desc`,
        startScript: {
            mapName: "Map",
            allyTeams: {
                players: {
                    teams: {
                        team1: {
                            name: "team1",
                        },
                    },
                },
            },
        },
    };
}

describe("getCampaigns", () => {
    beforeEach(() => {
        getGameFilesMock.mockReset();
        mkdirMock.mockClear();
        writeFileMock.mockClear();
        readFileMock.mockClear();

        const armadaCampaign = {
            campaignId: "armada",
            title: "Armada",
            description: "A",
            players: [1],
            missions: ["m2"],
            unlocks: { m2: ["m1"] },
        };
        const cortexCampaign = {
            campaignId: "cortex",
            title: "Cortex",
            description: "C",
            players: [1],
            prerequisites: ["armada"],
        };

        getGameFilesMock.mockImplementation(async (_packageMd5: string, pattern: string) => {
            if (pattern === "missions/manifest.json") {
                return [sdpJson("missions/manifest.json", { campaigns: ["cortex"], scenarios: [] })];
            }
            if (pattern === "missions/campaigns/*/campaign.json") {
                return [sdpJson("missions/campaigns/armada/campaign.json", armadaCampaign), sdpJson("missions/campaigns/cortex/campaign.json", cortexCampaign)];
            }
            if (pattern === "missions/campaigns/armada/*/mission.json") {
                return [sdpJson("missions/campaigns/armada/m1/mission.json", mission("m1")), sdpJson("missions/campaigns/armada/m2/mission.json", mission("m2"))];
            }
            if (pattern === "missions/campaigns/cortex/*/mission.json") {
                return [sdpJson("missions/campaigns/cortex/c1/mission.json", mission("c1"))];
            }

            return [];
        });
    });

    it("orders campaigns and missions by manifest/json and applies simple unlock rules", async () => {
        const campaigns = await getCampaigns("pkg-md5");

        expect(mkdirMock).toHaveBeenCalledWith("/campaign-images", { recursive: true });
        expect(campaigns.map((campaign) => campaign.campaignId)).toEqual(["cortex", "armada"]);

        expect(Object.keys(campaigns[0].missions)).toEqual(["c1"]);
        expect(Object.keys(campaigns[1].missions)).toEqual(["m2", "m1"]);

        expect(campaigns[0].unlocked).toBe(false);
        expect(campaigns[1].unlocked).toBe(true);
        expect(campaigns[1].missions.m2.unlocked).toBe(true);
        expect(campaigns[1].missions.m1.unlocked).toBe(true);
    });
});
