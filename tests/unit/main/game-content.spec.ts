// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SdpFile, SdpFileMeta } from "@main/content/game/sdp";

// Temp dirs stand in for the image cache and the game archive, so nothing is written into the repo.
// Hoisted so the @main/config/app mock below can point the cache at them; both are created lazily,
// by getCampaigns itself and by the harness respectively.
const { CACHE_DIR, ARCHIVE_DIR } = await vi.hoisted(async () => {
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const root = join(tmpdir(), `bar-lobby-game-content-${process.pid}-${Date.now()}`);
    return { CACHE_DIR: join(root, "cache"), ARCHIVE_DIR: join(root, "archive") };
});

vi.mock("electron", () => ({
    app: {
        isPackaged: false,
        getPath: vi.fn(() => path.join(os.tmpdir(), "bar-lobby-electron")),
        setPath: vi.fn(),
        getName: vi.fn(() => "bar-lobby"),
    },
    ipcRenderer: { on: vi.fn(), send: vi.fn(), invoke: vi.fn() },
    isPackaged: false,
}));

vi.mock("@main/config/app", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@main/config/app")>()),
    CAMPAIGN_IMAGE_PATH: CACHE_DIR,
}));

const { GameContentAPI } = await import("@main/content/game/game-content");

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_VERSION = "Beyond All Reason test-2026-06-03-stable";
const PACKAGE_MD5 = "abc123";

const CAMPAIGNS_PATH = "missions/campaigns";

const CAMPAIGN_DIR_ARMADA = "01_armada";
const CAMPAIGN_DIR_CORTEX = "02_cortex";
const CAMPAIGN_ID_ARMADA = "armada";
const CAMPAIGN_ID_CORTEX = "cortex";

const MISSION_DIR_FIRST = "01_first";
const MISSION_DIR_SECOND = "02_second";
const MISSION_DIR_THIRD = "03_third";
const MISSION_ID_FIRST = "first_steps";
const MISSION_ID_SECOND = "second_wave";
const MISSION_ID_THIRD = "third_front";

const DIFFICULTY_EASY = "Easy";
const MAP_NAME = "TestMap_v1";
const LOGO_FILE = "logo.png";
const BACKGROUND_FILE = "bg.jpg";
const MISSION_IMAGE_FILE = "preview.png";
const IMAGE_BYTES = Buffer.from("fake-png-bytes");

// ─── Fixtures ────────────────────────────────────────────────────────────────

function campaignJson(campaignId: string, overrides: Record<string, unknown> = {}) {
    return {
        campaignId,
        title: `Campaign ${campaignId}`,
        description: "A test campaign",
        players: [1],
        difficulties: { [DIFFICULTY_EASY]: { playerHandicap: 0, enemyHandicap: 0 } },
        defaultDifficulty: DIFFICULTY_EASY,
        ...overrides,
    };
}

function missionJson(missionId: string, overrides: Record<string, unknown> = {}) {
    return {
        missionId,
        title: `Mission ${missionId}`,
        description: "A test mission",
        startScript: {
            mapName: MAP_NAME,
            allyTeams: { Ally0: { teams: { Player: { name: "Player" } } } },
        },
        ...overrides,
    };
}

/** An archive laid out as `archive-relative path -> file contents`. */
type Archive = Record<string, unknown>;

function campaignArchive(): Archive {
    return {
        [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`]: campaignJson(CAMPAIGN_ID_ARMADA),
        [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}/mission.json`]: missionJson(MISSION_ID_FIRST),
        [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_SECOND}/mission.json`]: missionJson(MISSION_ID_SECOND),
        [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/campaign.json`]: campaignJson(CAMPAIGN_ID_CORTEX),
        [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/${MISSION_DIR_THIRD}/mission.json`]: missionJson(MISSION_ID_THIRD),
    };
}

// ─── Harness ─────────────────────────────────────────────────────────────────

/** Converts an archive glob (only `*` within a path segment is used) to an anchored regex. */
function globToRegExp(pattern: string): RegExp {
    const body = pattern
        .split("/")
        .map((segment) => (segment === "*" ? "[^/]*" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        .join("/");
    return new RegExp(`^${body}$`);
}

function toBuffer(contents: unknown): Buffer {
    return Buffer.isBuffer(contents) ? contents : Buffer.from(JSON.stringify(contents));
}

/**
 * How `getGameFiles` reports a match. The two real code paths disagree on what
 * `fileName` means, and everything downstream has to cope with both:
 * - `sdp` (packaged): `fileName` is the archive-relative path.
 * - `sdd` (custom dir): `fileName` is only the basename, so the archive-relative
 *   path has to be recovered from the absolute `archivePath`.
 */
type ArchiveMode = "sdp" | "sdd";

/**
 * Replaces the archive layer so the campaign/mission parsing pipeline can be exercised
 * without a real .sdp/.sdd on disk. Files backing extracted assets are written to a temp
 * dir, so asset extraction runs against the real filesystem.
 */
class TestGameContentAPI extends GameContentAPI {
    public readonly requestedPatterns: string[] = [];

    constructor(
        private readonly archive: Archive,
        private readonly mode: ArchiveMode = "sdp",
        private readonly separator = "/"
    ) {
        super();
        this.availableVersions.set(GAME_VERSION, { gameVersion: GAME_VERSION, packageMd5: PACKAGE_MD5 } as never);
    }

    protected override async getGameFiles(packageMd5: string, filePattern: string, parseData?: false): Promise<SdpFileMeta[]>;
    protected override async getGameFiles(packageMd5: string, filePattern: string, parseData?: true): Promise<SdpFile[]>;
    protected override async getGameFiles(packageMd5: string, filePattern: string, parseData = false): Promise<SdpFileMeta[] | SdpFile[]> {
        this.requestedPatterns.push(filePattern);
        expect(packageMd5).toBe(PACKAGE_MD5);

        const matcher = globToRegExp(filePattern);
        return Object.entries(this.archive)
            .filter(([archiveRelativePath]) => matcher.test(archiveRelativePath))
            .map(([archiveRelativePath, contents]) => {
                const data = toBuffer(contents);
                // Assets are read back off disk by extractAsset, so they need to really exist.
                const archivePath = path.join(ARCHIVE_DIR, archiveRelativePath);
                fs.mkdirSync(path.dirname(archivePath), { recursive: true });
                fs.writeFileSync(archivePath, data);

                const meta: SdpFileMeta = {
                    fileName: this.mode === "sdp" ? archiveRelativePath.replaceAll("/", this.separator) : path.basename(archiveRelativePath),
                    md5: "",
                    crc32: "",
                    filesizeBytes: data.length,
                    archivePath: this.mode === "sdp" ? archivePath : archivePath.replaceAll("/", this.separator),
                };
                return parseData ? { ...meta, data } : meta;
            });
    }
}

afterAll(() => {
    fs.rmSync(path.dirname(CACHE_DIR), { recursive: true, force: true });
});

beforeEach(() => {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getCampaigns", () => {
    it("discovers every campaign folder and nests its mission folders under it", async () => {
        const campaigns = await new TestGameContentAPI(campaignArchive()).getCampaigns(GAME_VERSION);

        expect(campaigns.map((c) => c.campaignId)).toEqual([CAMPAIGN_ID_ARMADA, CAMPAIGN_ID_CORTEX]);
        expect(Object.keys(campaigns[0].missions)).toEqual([MISSION_ID_FIRST, MISSION_ID_SECOND]);
        expect(Object.keys(campaigns[1].missions)).toEqual([MISSION_ID_THIRD]);
    });

    it("derives missionFolder from the folder names so the game can locate the mission's Lua", async () => {
        const campaigns = await new TestGameContentAPI(campaignArchive()).getCampaigns(GAME_VERSION);

        expect(campaigns[0].missions[MISSION_ID_FIRST].missionFolder).toBe(`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}`);
        expect(campaigns[1].missions[MISSION_ID_THIRD].missionFolder).toBe(`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/${MISSION_DIR_THIRD}`);
    });

    it("stamps each mission with its owning campaign", async () => {
        const campaigns = await new TestGameContentAPI(campaignArchive()).getCampaigns(GAME_VERSION);

        expect(campaigns[0].missions[MISSION_ID_FIRST].campaignId).toBe(CAMPAIGN_ID_ARMADA);
        expect(campaigns[1].missions[MISSION_ID_THIRD].campaignId).toBe(CAMPAIGN_ID_CORTEX);
    });

    it("orders campaigns and missions by their NN_ folder prefixes, not by archive order", async () => {
        // Deliberately reversed: only the folder prefixes may decide display order.
        const archive: Archive = {
            [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/campaign.json`]: campaignJson(CAMPAIGN_ID_CORTEX),
            [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/${MISSION_DIR_THIRD}/mission.json`]: missionJson(MISSION_ID_THIRD),
            [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`]: campaignJson(CAMPAIGN_ID_ARMADA),
            [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_SECOND}/mission.json`]: missionJson(MISSION_ID_SECOND),
            [`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}/mission.json`]: missionJson(MISSION_ID_FIRST),
        };

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns.map((c) => c.campaignId)).toEqual([CAMPAIGN_ID_ARMADA, CAMPAIGN_ID_CORTEX]);
        expect(Object.keys(campaigns[0].missions)).toEqual([MISSION_ID_FIRST, MISSION_ID_SECOND]);
    });

    it("unlocks the first campaign only", async () => {
        const campaigns = await new TestGameContentAPI(campaignArchive()).getCampaigns(GAME_VERSION);

        expect(campaigns[0].unlocked).toBe(true);
        expect(campaigns[1].unlocked).toBeUndefined();
    });

    it("unlocks every mission, even one the campaign lists prerequisites for", async () => {
        // The lobby has no mission-completion state yet, so 'unlocks' cannot gate anything.
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`] = campaignJson(CAMPAIGN_ID_ARMADA, {
            unlocks: { [MISSION_ID_SECOND]: [MISSION_ID_FIRST] },
        });

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns[0].missions[MISSION_ID_SECOND].unlocked).toBe(true);
    });

    it("returns an empty list when the game version is not installed", async () => {
        const campaigns = await new TestGameContentAPI(campaignArchive()).getCampaigns("some-uninstalled-version");

        expect(campaigns).toEqual([]);
    });

    it("returns an empty list when the archive holds no campaigns", async () => {
        expect(await new TestGameContentAPI({}).getCampaigns(GAME_VERSION)).toEqual([]);
    });
});

describe("getCampaigns error isolation", () => {
    it("skips a campaign that fails schema validation and keeps the rest", async () => {
        const archive = campaignArchive();
        // defaultDifficulty is required.
        delete (archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`] as Record<string, unknown>).defaultDifficulty;

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns.map((c) => c.campaignId)).toEqual([CAMPAIGN_ID_CORTEX]);
    });

    it("skips a campaign carrying an unknown property", async () => {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`] = campaignJson(CAMPAIGN_ID_ARMADA, { notASchemaProperty: true });

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns.map((c) => c.campaignId)).toEqual([CAMPAIGN_ID_CORTEX]);
    });

    it("skips a campaign whose JSON does not parse", async () => {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`] = Buffer.from("{ this is not json");

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns.map((c) => c.campaignId)).toEqual([CAMPAIGN_ID_CORTEX]);
    });

    it("skips an invalid mission but still loads its campaign and sibling missions", async () => {
        const archive = campaignArchive();
        // startScript is required.
        delete (archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}/mission.json`] as Record<string, unknown>).startScript;

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns.map((c) => c.campaignId)).toEqual([CAMPAIGN_ID_ARMADA, CAMPAIGN_ID_CORTEX]);
        expect(Object.keys(campaigns[0].missions)).toEqual([MISSION_ID_SECOND]);
    });

    it("keeps only the first of two campaigns sharing a campaignId, since lookups key on it", async () => {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/campaign.json`] = campaignJson(CAMPAIGN_ID_ARMADA, { title: "Duplicate" });

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns).toHaveLength(1);
        expect(campaigns[0].title).toBe(`Campaign ${CAMPAIGN_ID_ARMADA}`);
    });

    it("keeps only the first of two missions sharing a missionId within a campaign", async () => {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_SECOND}/mission.json`] = missionJson(MISSION_ID_FIRST, { title: "Duplicate" });

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(Object.keys(campaigns[0].missions)).toEqual([MISSION_ID_FIRST]);
        expect(campaigns[0].missions[MISSION_ID_FIRST].title).toBe(`Mission ${MISSION_ID_FIRST}`);
    });

    it("allows the same missionId in two different campaigns", async () => {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_CORTEX}/${MISSION_DIR_THIRD}/mission.json`] = missionJson(MISSION_ID_FIRST);

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(Object.keys(campaigns[0].missions)).toContain(MISSION_ID_FIRST);
        expect(Object.keys(campaigns[1].missions)).toEqual([MISSION_ID_FIRST]);
        expect(campaigns[1].missions[MISSION_ID_FIRST].campaignId).toBe(CAMPAIGN_ID_CORTEX);
    });
});

describe("getCampaigns asset extraction", () => {
    function archiveWithImages(): Archive {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`] = campaignJson(CAMPAIGN_ID_ARMADA, {
            logo: LOGO_FILE,
            backgroundImage: BACKGROUND_FILE,
        });
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}/mission.json`] = missionJson(MISSION_ID_FIRST, { image: MISSION_IMAGE_FILE });
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${LOGO_FILE}`] = IMAGE_BYTES;
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${BACKGROUND_FILE}`] = IMAGE_BYTES;
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}/${MISSION_IMAGE_FILE}`] = IMAGE_BYTES;
        return archive;
    }

    it("extracts campaign and mission images into the cache directory", async () => {
        const campaigns = await new TestGameContentAPI(archiveWithImages()).getCampaigns(GAME_VERSION);

        const { logo, backgroundImage } = campaigns[0];
        const missionImage = campaigns[0].missions[MISSION_ID_FIRST].image;

        for (const asset of [logo, backgroundImage, missionImage]) {
            expect(asset).toBeDefined();
            expect(path.dirname(asset!)).toBe(CACHE_DIR);
            expect(fs.readFileSync(asset!)).toEqual(IMAGE_BYTES);
        }
    });

    it("prefixes cached file names so campaigns and missions cannot collide", async () => {
        const campaigns = await new TestGameContentAPI(archiveWithImages()).getCampaigns(GAME_VERSION);

        expect(path.basename(campaigns[0].logo!)).toBe(`${CAMPAIGN_DIR_ARMADA}_${LOGO_FILE}`);
        expect(path.basename(campaigns[0].missions[MISSION_ID_FIRST].image!)).toBe(`${CAMPAIGN_DIR_ARMADA}_${MISSION_DIR_FIRST}_${MISSION_IMAGE_FILE}`);
    });

    it("leaves images undefined when the definition names none", async () => {
        const campaigns = await new TestGameContentAPI(campaignArchive()).getCampaigns(GAME_VERSION);

        expect(campaigns[0].logo).toBeUndefined();
        expect(campaigns[0].backgroundImage).toBeUndefined();
        expect(campaigns[0].missions[MISSION_ID_FIRST].image).toBeUndefined();
    });

    it("leaves the image undefined when the named file is missing from the archive", async () => {
        const archive = campaignArchive();
        archive[`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/campaign.json`] = campaignJson(CAMPAIGN_ID_ARMADA, { logo: "does-not-exist.png" });

        const campaigns = await new TestGameContentAPI(archive).getCampaigns(GAME_VERSION);

        expect(campaigns[0].logo).toBeUndefined();
        expect(campaigns[0].campaignId).toBe(CAMPAIGN_ID_ARMADA);
    });
});

describe("getCampaigns archive layouts", () => {
    it("reads a custom .sdd directory, where fileName is only a basename, identically to a packaged archive", async () => {
        const packaged = await new TestGameContentAPI(campaignArchive(), "sdp").getCampaigns(GAME_VERSION);
        const customDir = await new TestGameContentAPI(campaignArchive(), "sdd").getCampaigns(GAME_VERSION);

        expect(customDir).toEqual(packaged);
    });

    it("reads a custom .sdd directory using Windows path separators", async () => {
        const packaged = await new TestGameContentAPI(campaignArchive(), "sdp").getCampaigns(GAME_VERSION);
        const windows = await new TestGameContentAPI(campaignArchive(), "sdd", "\\").getCampaigns(GAME_VERSION);

        expect(windows.map((c) => c.campaignId)).toEqual(packaged.map((c) => c.campaignId));
        expect(windows[0].missions[MISSION_ID_FIRST].missionFolder).toBe(`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/${MISSION_DIR_FIRST}`);
    });

    it("looks for campaigns and missions under missions/campaigns", async () => {
        const api = new TestGameContentAPI(campaignArchive());
        await api.getCampaigns(GAME_VERSION);

        expect(api.requestedPatterns).toContain(`${CAMPAIGNS_PATH}/*/campaign.json`);
        expect(api.requestedPatterns).toContain(`${CAMPAIGNS_PATH}/${CAMPAIGN_DIR_ARMADA}/*/mission.json`);
    });
});
