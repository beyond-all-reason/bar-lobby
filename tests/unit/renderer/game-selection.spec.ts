// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { GameVersion } from "@main/content/game/game-version";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getInstalledVersions, infos } = vi.hoisted(() => ({
    getInstalledVersions: vi.fn(),
    infos: { bundledContent: undefined as { engines: string[]; games: string[] } | undefined },
}));

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/contents.store", () => ({ onContentSettled: vi.fn() }));
vi.mock("@renderer/store/infos.store", () => ({ infosStore: infos }));
vi.stubGlobal("window", Object.assign(window, { game: { getInstalledVersions } }));

import { gameStore, refreshGameStore } from "@renderer/store/game.store";

const FIRST = "Beyond All Reason test-1-abc";
const LAST = "Beyond All Reason test-2-def";

function installed(...versions: string[]) {
    getInstalledVersions.mockResolvedValue(versions.map((gameVersion) => ({ gameVersion, luaOptionSections: [] }) as unknown as GameVersion));
}

describe("game version selection", () => {
    beforeEach(() => {
        infos.bundledContent = undefined;
    });

    it("selects the last installed version when nothing is bundled", async () => {
        installed(FIRST, LAST);

        await refreshGameStore();

        expect(gameStore.selectedGameVersion?.gameVersion).toBe(LAST);
    });

    it("selects the one game bundled with the install", async () => {
        infos.bundledContent = { engines: [], games: [FIRST] };
        installed(FIRST, LAST);

        await refreshGameStore();

        expect(gameStore.selectedGameVersion?.gameVersion).toBe(FIRST);
    });

    it("falls back to the last installed version when the bundled game is not installed", async () => {
        infos.bundledContent = { engines: [], games: ["Beyond All Reason test-3-ghi"] };
        installed(FIRST, LAST);

        await refreshGameStore();

        expect(gameStore.selectedGameVersion?.gameVersion).toBe(LAST);
    });
});
