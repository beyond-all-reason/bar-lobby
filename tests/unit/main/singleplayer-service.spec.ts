// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const paths = vi.hoisted(() => ({ saves: "" }));

vi.mock("electron", () => ({}));
vi.mock("@main/typed-ipc", () => ({ ipcMain: { handle: vi.fn() } }));
// app.ts calls app.setPath at module scope, so it can't be imported in a test.
vi.mock("@main/config/app", () => ({
    getContentRoots: () => [{ source: "official", rootId: "official", path: path.resolve("tests/fixtures/content") }],
    get SAVES_PATH() {
        return paths.saves;
    },
}));

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
        await expect(singleplayerService.recordResult("tutorial", official("sample-tutorial"), { missionId: "something-else", outcome: "victory" })).rejects.toThrow(/names mission something-else/);
        expect(await singleplayerService.readSave("tutorial", official("sample-tutorial"))).toBeUndefined();
    });

    it("refuses an unknown kind with a clear error", async () => {
        await expect(singleplayerService.recordResult("mission" as never, official("sample-campaign"), { missionId: "mission01", outcome: "victory" })).rejects.toThrow(
            /Unknown singleplayer kind "mission"/
        );
    });

    it("takes any of the campaign's missions for a campaign", async () => {
        const save = await singleplayerService.recordResult("campaign", official("sample-campaign"), { missionId: "mission01", outcome: "victory" });

        expect(save.plays).toEqual({ mission01: { victories: 1, failures: 0 } });
    });
});
