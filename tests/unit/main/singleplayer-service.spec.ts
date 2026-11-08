// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const paths = vi.hoisted(() => ({ saves: "", roots: [] as { source: "custom"; rootId: string; path: string }[] }));
// What a Steam install with the outpost-strike example's engine, game and map would offer.
const launching = vi.hoisted(() => ({
    launchMission: vi.fn(async () => undefined),
    installed: { engine: ["2026.07.04"], game: ["Beyond All Reason test-31820-45ea098"], map: ["Quicksilver Remake 1.24"] } as Record<string, string[]>,
}));

vi.mock("electron", () => ({}));
const ipc = vi.hoisted(() => ({ handlers: new Map<string, (...args: unknown[]) => unknown>() }));
vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle: (channel: string, handler: (...args: unknown[]) => unknown) => ipc.handlers.set(channel, handler) } }));
// app.ts calls app.setPath at module scope, so it can't be imported in a test.
vi.mock("@main/config/app", () => ({
    getContentRoots: () => [{ source: "custom", rootId: "custom", path: path.resolve("tests/fixtures/content") }, ...paths.roots],
    get SAVES_PATH() {
        return paths.saves;
    },
}));

vi.mock("@main/game/game", () => ({ gameAPI: { launchMission: launching.launchMission } }));
vi.mock("@main/content/content-api", () => ({
    contentAPI: {
        isPresent: ({ type, id }: { type: string; id: string }) => launching.installed[type].includes(id),
        canAcquire: () => false,
        installed: (type: string) => launching.installed[type].map((id) => ({ type, id })),
    },
}));
vi.mock("@main/config/install-defaults", () => ({ getInstallDefaults: () => ({}), getDefaultEngineVersion: () => "2026.07.04" }));

// The real settings service reads its file from the mocked config paths.
vi.mock("@main/services/settings.service", () => ({ settingsService: { getSettings: () => ({ devMode: false }) } }));

const { singleplayerService } = await import("@main/services/singleplayer.service");

const custom = (id: string) => ({ source: "custom" as const, rootId: "custom", id });

describe("singleplayerService.recordResult", () => {
    beforeAll(async () => {
        paths.saves = await fs.mkdtemp(path.join(os.tmpdir(), "singleplayer-service-"));
    });

    afterAll(async () => {
        await fs.rm(paths.saves, { recursive: true, force: true });
    });

    it("counts a scenario's result under the scenario's own id", async () => {
        const save = await singleplayerService.recordResult("scenario", custom("sample-scenario"), { missionId: "sample-scenario", outcome: "victory" });

        expect(save.plays).toEqual({ "sample-scenario": { victories: 1, failures: 0 } });
    });

    it("refuses a scenario or tutorial result that names another mission, and saves nothing", async () => {
        await expect(singleplayerService.recordResult("tutorial", custom("sample-tutorial"), { missionId: "something-else", outcome: "victory" })).rejects.toThrow(
            expect.objectContaining({ reason: "invalid_result", message: expect.stringMatching(/names mission something-else/) })
        );
        expect(await singleplayerService.readSave("tutorial", custom("sample-tutorial"))).toBeUndefined();
    });

    it("refuses an unknown kind with a clear error", async () => {
        await expect(singleplayerService.recordResult("mission" as never, custom("sample-campaign"), { missionId: "mission01", outcome: "victory" })).rejects.toThrow(
            expect.objectContaining({ reason: "unknown_item", message: expect.stringMatching(/Unknown singleplayer kind "mission"/) })
        );
    });

    it("takes any of the campaign's missions for a campaign", async () => {
        const save = await singleplayerService.recordResult("campaign", custom("sample-campaign"), { missionId: "mission01", outcome: "victory" });

        expect(save.plays).toEqual({ mission01: { victories: 1, failures: 0 } });
    });
});

describe("singleplayer IPC handlers", () => {
    beforeAll(async () => {
        paths.saves = await fs.mkdtemp(path.join(os.tmpdir(), "singleplayer-service-"));
        singleplayerService.registerIpcHandlers({ send: vi.fn() } as never);
    });

    afterAll(async () => {
        await fs.rm(paths.saves, { recursive: true, force: true });
    });

    const recordOverIpc = (id: string, missionId: string) => ipc.handlers.get("singleplayer:recordResult")!({}, "scenario", "custom", "custom", id, { missionId, outcome: "victory" });

    it("gives the save written", async () => {
        expect(await recordOverIpc("sample-scenario", "sample-scenario")).toMatchObject({ status: "success", data: { plays: { "sample-scenario": { victories: 1, failures: 0 } } } });
    });

    it("gives the content and the saves as results", async () => {
        expect(await ipc.handlers.get("singleplayer:list")!({})).toMatchObject({
            status: "success",
            data: { scenarios: expect.arrayContaining([expect.objectContaining({ id: "sample-scenario" })]) },
        });
        expect(await ipc.handlers.get("singleplayer:getSaves")!({})).toMatchObject({ status: "success", data: { saves: [{ item: { id: "sample-scenario" } }], unusable: [] } });
    });

    it("names the installed items whose save can't be used, and leaves out a file no installed item's save is kept in", async () => {
        const { saveFileName } = await import("@main/content/singleplayer/saves");
        await fs.writeFile(path.join(paths.saves, saveFileName("tutorial", custom("sample-tutorial"))), "{ not json");
        await fs.writeFile(path.join(paths.saves, saveFileName("campaign", custom("not-installed"))), "{ not json");

        expect(await ipc.handlers.get("singleplayer:getSaves")!({})).toMatchObject({
            status: "success",
            data: { saves: [{ item: { id: "sample-scenario" } }], unusable: [{ kind: "tutorial", ...custom("sample-tutorial") }] },
        });
    });

    it("gives the reason a change was refused as a code, with the error behind it as details", async () => {
        expect(await recordOverIpc("no-such-scenario", "no-such-scenario")).toEqual({ status: "failed", reason: "unknown_item", details: expect.stringMatching(/No scenario no-such-scenario/) });
    });

    const setDifficultyOverIpc = (kind: string, id: string, difficulty: string) => ipc.handlers.get("singleplayer:setDifficulty")!({}, kind, "custom", "custom", id, difficulty);

    it("saves a difficulty the item offers", async () => {
        expect(await setDifficultyOverIpc("campaign", "sample-campaign", "story")).toMatchObject({ status: "success", data: { difficulty: "story" } });
    });

    // The combat tutorial offers easy, medium and hard only.
    it("refuses a difficulty the item doesn't offer, and saves nothing", async () => {
        expect(await setDifficultyOverIpc("tutorial", "combat", "story")).toEqual({
            status: "failed",
            reason: "invalid_difficulty",
            details: expect.stringMatching(/does not offer difficulty "story"/),
        });
        expect(await singleplayerService.readSave("tutorial", custom("combat"))).toBeUndefined();
    });

    describe("launching", () => {
        const sdz = path.resolve("tests/fixtures/content-sdz");
        const launchOverIpc = (kind: string, rootId: string, id: string, missionId?: string) => ipc.handlers.get("singleplayer:launch")!({}, kind, "custom", rootId, id, missionId, "Commander");

        beforeAll(async () => {
            paths.roots = [{ source: "custom", rootId: "sdz", path: sdz }];
            await ipc.handlers.get("singleplayer:list")!({});
        });

        afterAll(() => {
            paths.roots = [];
        });

        it("launches the outpost-strike example from its folder, as its mutator, on the engine and game it depends on", async () => {
            launching.launchMission.mockClear();

            expect(await launchOverIpc("scenario", "sdz", "outpost-strike")).toEqual({ status: "success", data: undefined });
            expect(launching.launchMission).toHaveBeenCalledWith({
                engineVersion: "2026.07.04",
                gameVersion: "Beyond All Reason test-31820-45ea098",
                mapSpringName: "Quicksilver Remake 1.24",
                script: expect.stringContaining("gametype=bar-scenario-outpost-strike 1.0;"),
                dataDirs: [path.join(sdz, "scenarios", "outpost-strike")],
            });
        });

        it("gives the reason a launch was refused as a code", async () => {
            expect(await launchOverIpc("scenario", "custom", "sample-scenario")).toEqual({
                status: "failed",
                reason: "no_archive",
                details: expect.stringMatching(/scenario sample-scenario has no mission archive/),
            });
            expect(await launchOverIpc("campaign", "custom", "sample-campaign", "no-such-mission")).toEqual({
                status: "failed",
                reason: "unknown_item",
                details: expect.stringMatching(/mission no-such-mission/),
            });
        });

        it("refuses when the install lacks the game the archive depends on", async () => {
            const games = launching.installed.game;
            launching.installed.game = ["Beyond All Reason test-1-abc"];
            try {
                expect(await launchOverIpc("scenario", "sdz", "outpost-strike")).toMatchObject({ status: "failed", reason: "no_engine_and_game" });
            } finally {
                launching.installed.game = games;
            }
        });
    });
});
