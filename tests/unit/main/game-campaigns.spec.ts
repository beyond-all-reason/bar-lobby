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

const CAMPAIGNS = "data/singleplayer/campaigns";

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
        titleKey: `${id}.title`,
        descriptionKey: `${id}.description`,
        startScript: {
            mapName: "Map",
            allyTeams: {
                players: {
                    teams: {
                        team1: { nameKey: `${id}.teams.team1` },
                    },
                },
            },
        },
    };
}

// Files in the archive, keyed by the pattern the loader asks for.
let files: Record<string, SdpFile[]>;

describe("getCampaigns", () => {
    beforeEach(() => {
        getGameFilesMock.mockReset();
        mkdirMock.mockClear();
        writeFileMock.mockClear();
        readFileMock.mockClear();

        files = {
            [`${CAMPAIGNS}/manifest.json`]: [sdpJson(`${CAMPAIGNS}/manifest.json`, { campaigns: ["cortex-main", "armada-main"] })],

            [`${CAMPAIGNS}/armada-main/campaign.json`]: [
                sdpJson(`${CAMPAIGNS}/armada-main/campaign.json`, {
                    campaignId: "armada-main",
                    titleKey: "armada-main.title",
                    descriptionKey: "armada-main.description",
                    players: [1],
                    missions: ["m2", "m1"],
                }),
            ],
            [`${CAMPAIGNS}/armada-main/language/en.json`]: [
                sdpJson(`${CAMPAIGNS}/armada-main/language/en.json`, {
                    "armada-main.title": "Armada",
                    "armada-main.description": "Armada campaign",
                    "m1.title": "Mission One",
                    "m1.description": "First",
                    "m1.teams.team1": "Armada Player",
                    "m2.title": "Mission Two",
                    "m2.description": "Second",
                    "m2.teams.team1": "Armada Player",
                }),
            ],
            [`${CAMPAIGNS}/armada-main/m1/mission.json`]: [sdpJson(`${CAMPAIGNS}/armada-main/m1/mission.json`, mission("m1"))],
            [`${CAMPAIGNS}/armada-main/m2/mission.json`]: [sdpJson(`${CAMPAIGNS}/armada-main/m2/mission.json`, mission("m2"))],

            [`${CAMPAIGNS}/cortex-main/campaign.json`]: [
                sdpJson(`${CAMPAIGNS}/cortex-main/campaign.json`, {
                    campaignId: "cortex-main",
                    titleKey: "cortex-main.title",
                    descriptionKey: "cortex-main.description",
                    players: [1],
                    prerequisites: ["armada-main"],
                    missions: ["c1"],
                }),
            ],
            [`${CAMPAIGNS}/cortex-main/language/en.json`]: [
                sdpJson(`${CAMPAIGNS}/cortex-main/language/en.json`, {
                    "cortex-main.title": "Cortex",
                    "cortex-main.description": "Cortex campaign",
                    "c1.title": "Cortex One",
                    "c1.description": "Only",
                    "c1.teams.team1": "Cortex Player",
                }),
            ],
            [`${CAMPAIGNS}/cortex-main/c1/mission.json`]: [sdpJson(`${CAMPAIGNS}/cortex-main/c1/mission.json`, mission("c1"))],
        };

        getGameFilesMock.mockImplementation(async (_packageMd5: string, pattern: string) => files[pattern] ?? []);
    });

    it("loads campaigns and missions in the order they are listed", async () => {
        const campaigns = await getCampaigns("pkg-md5");

        expect(mkdirMock).toHaveBeenCalledWith("/campaign-images", { recursive: true });
        expect(campaigns.map((campaign) => campaign.campaignId)).toEqual(["cortex-main", "armada-main"]);
        expect(Object.keys(campaigns[1].missions)).toEqual(["m2", "m1"]);
    });

    it("resolves campaign and mission text from the campaign's language file", async () => {
        const [cortex, armada] = await getCampaigns("pkg-md5");

        expect(armada.title).toBe("Armada");
        expect(armada.description).toBe("Armada campaign");
        expect(armada.missions.m1.title).toBe("Mission One");
        expect(armada.missions.m1.description).toBe("First");
        expect(armada.missions.m1.startScript.allyTeams.players.teams.team1.name).toBe("Armada Player");
        expect(cortex.title).toBe("Cortex");
    });

    it("does not leak I18N keys into the resolved model", async () => {
        const [, armada] = await getCampaigns("pkg-md5");

        expect(armada).not.toHaveProperty("titleKey");
        expect(armada).not.toHaveProperty("descriptionKey");
        expect(armada.missions.m1).not.toHaveProperty("titleKey");
        expect(armada.missions.m1.startScript.allyTeams.players.teams.team1).not.toHaveProperty("nameKey");
    });

    it("lets a mission's own language file override its campaign's", async () => {
        files[`${CAMPAIGNS}/armada-main/m1/language/en.json`] = [sdpJson(`${CAMPAIGNS}/armada-main/m1/language/en.json`, { "m1.title": "Overridden" })];

        const [, armada] = await getCampaigns("pkg-md5");

        expect(armada.missions.m1.title).toBe("Overridden");
        // Keys the mission does not define still come from the campaign.
        expect(armada.missions.m1.description).toBe("First");
    });

    it("prefers the requested language and falls back to English", async () => {
        files[`${CAMPAIGNS}/armada-main/language/de.json`] = [sdpJson(`${CAMPAIGNS}/armada-main/language/de.json`, { "armada-main.title": "Armada (DE)" })];

        const [, german] = await getCampaigns("pkg-md5", "de");
        expect(german.title).toBe("Armada (DE)");

        const [, french] = await getCampaigns("pkg-md5", "fr");
        expect(french.title).toBe("Armada");
    });

    it("shows the key itself when a translation is missing", async () => {
        delete files[`${CAMPAIGNS}/armada-main/language/en.json`];

        const [, armada] = await getCampaigns("pkg-md5");

        expect(armada.title).toBe("armada-main.title");
        expect(armada.missions.m1.title).toBe("m1.title");
    });

    it("ignores folders that no list names", async () => {
        files[`${CAMPAIGNS}/armada-main/shared/mission.json`] = [sdpJson(`${CAMPAIGNS}/armada-main/shared/mission.json`, mission("shared"))];
        files[`${CAMPAIGNS}/unlisted-main/campaign.json`] = [
            sdpJson(`${CAMPAIGNS}/unlisted-main/campaign.json`, {
                campaignId: "unlisted-main",
                titleKey: "t",
                descriptionKey: "d",
                players: [1],
            }),
        ];

        const campaigns = await getCampaigns("pkg-md5");

        expect(campaigns.map((campaign) => campaign.campaignId)).toEqual(["cortex-main", "armada-main"]);
        expect(Object.keys(campaigns[1].missions)).toEqual(["m2", "m1"]);
    });

    it("skips a campaign whose folder name does not match its campaignId", async () => {
        files[`${CAMPAIGNS}/armada-main/campaign.json`] = [
            sdpJson(`${CAMPAIGNS}/armada-main/campaign.json`, {
                campaignId: "something-else",
                titleKey: "t",
                descriptionKey: "d",
                players: [1],
            }),
        ];

        const campaigns = await getCampaigns("pkg-md5");

        expect(campaigns.map((campaign) => campaign.campaignId)).toEqual(["cortex-main"]);
    });

    it("keeps loading the other campaigns when one is invalid", async () => {
        files[`${CAMPAIGNS}/cortex-main/campaign.json`] = [sdpJson(`${CAMPAIGNS}/cortex-main/campaign.json`, { campaignId: "cortex-main" })];

        const campaigns = await getCampaigns("pkg-md5");

        expect(campaigns.map((campaign) => campaign.campaignId)).toEqual(["armada-main"]);
    });

    it("rejects a campaign still carrying the removed 'unlocks' map", async () => {
        // The schema sets additionalProperties: false, so a campaign written against the
        // older format fails to load rather than silently dropping its unlock rules.
        files[`${CAMPAIGNS}/cortex-main/campaign.json`] = [
            sdpJson(`${CAMPAIGNS}/cortex-main/campaign.json`, {
                campaignId: "cortex-main",
                titleKey: "cortex-main.title",
                descriptionKey: "cortex-main.description",
                players: [1],
                missions: ["c1"],
                unlocks: { c1: [] },
            }),
        ];

        const campaigns = await getCampaigns("pkg-md5");

        expect(campaigns.map((campaign) => campaign.campaignId)).toEqual(["armada-main"]);
    });

    it("returns nothing when the manifest lists no campaigns", async () => {
        files[`${CAMPAIGNS}/manifest.json`] = [sdpJson(`${CAMPAIGNS}/manifest.json`, { campaigns: [] })];

        await expect(getCampaigns("pkg-md5")).resolves.toEqual([]);
    });

    it("marks a campaign with prerequisites as locked", async () => {
        const [cortex, armada] = await getCampaigns("pkg-md5");

        expect(cortex.unlocked).toBe(false);
        expect(armada.unlocked).toBe(true);
    });
});
