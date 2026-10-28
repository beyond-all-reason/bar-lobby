// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const paths = vi.hoisted(() => ({ saves: "" }));

vi.mock("electron", () => ({}));
const ipc = vi.hoisted(() => ({ handlers: new Map<string, (...args: unknown[]) => unknown>() }));
vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle: (channel: string, handler: (...args: unknown[]) => unknown) => ipc.handlers.set(channel, handler) } }));
// app.ts calls app.setPath at module scope, so it can't be imported in a test.
vi.mock("@main/config/app", () => ({
    getContentRoots: () => [{ source: "official", rootId: "official", path: path.resolve("tests/fixtures/content") }],
    get SAVES_PATH() {
        return paths.saves;
    },
}));

// The real settings service reads its file from the mocked config paths.
vi.mock("@main/services/settings.service", () => ({ settingsService: { getSettings: () => ({ devMode: false }) } }));

const { singleplayerService } = await import("@main/services/singleplayer.service");

const official = (id: string) => ({ source: "official" as const, rootId: "official", id });

describe("singleplayerService.recordResult", () => {
    beforeAll(async () => {
        paths.saves = await fs.mkdtemp(path.join(os.tmpdir(), "singleplayer-service-"));
    });

    afterAll(async () => {
        await fs.rm(paths.saves, { recursive: true, force: true });
    });

    it("counts a scenario's result under the scenario's own id", async () => {
        const save = await singleplayerService.recordResult("scenario", official("sample-scenario"), { missionId: "sample-scenario", outcome: "victory" });

        expect(save.plays).toEqual({ "sample-scenario": { victories: 1, failures: 0 } });
    });

    it("refuses a scenario or tutorial result that names another mission, and saves nothing", async () => {
        await expect(singleplayerService.recordResult("tutorial", official("sample-tutorial"), { missionId: "something-else", outcome: "victory" })).rejects.toThrow(
            expect.objectContaining({ reason: "invalid_result", message: expect.stringMatching(/names mission something-else/) })
        );
        expect(await singleplayerService.readSave("tutorial", official("sample-tutorial"))).toBeUndefined();
    });

    it("refuses an unknown kind with a clear error", async () => {
        await expect(singleplayerService.recordResult("mission" as never, official("sample-campaign"), { missionId: "mission01", outcome: "victory" })).rejects.toThrow(
            expect.objectContaining({ reason: "unknown_item", message: expect.stringMatching(/Unknown singleplayer kind "mission"/) })
        );
    });

    it("takes any of the campaign's missions for a campaign", async () => {
        const save = await singleplayerService.recordResult("campaign", official("sample-campaign"), { missionId: "mission01", outcome: "victory" });

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

    const recordOverIpc = (id: string, missionId: string) => ipc.handlers.get("singleplayer:recordResult")!({}, "scenario", "official", "official", id, { missionId, outcome: "victory" });

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
        await fs.writeFile(path.join(paths.saves, saveFileName("tutorial", official("sample-tutorial"))), "{ not json");
        await fs.writeFile(path.join(paths.saves, saveFileName("campaign", official("not-installed"))), "{ not json");

        expect(await ipc.handlers.get("singleplayer:getSaves")!({})).toMatchObject({
            status: "success",
            data: { saves: [{ item: { id: "sample-scenario" } }], unusable: [{ kind: "tutorial", ...official("sample-tutorial") }] },
        });
    });

    it("gives the reason a change was refused as a code, with the error behind it as details", async () => {
        expect(await recordOverIpc("no-such-scenario", "no-such-scenario")).toEqual({ status: "failed", reason: "unknown_item", details: expect.stringMatching(/No scenario no-such-scenario/) });
    });
});
