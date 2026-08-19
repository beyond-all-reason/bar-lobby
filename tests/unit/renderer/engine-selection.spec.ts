// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { DEFAULT_ENGINE_VERSION } from "@main/config/default-versions";
import { EngineVersion } from "@main/content/engine/engine-version";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAvailableVersions } = vi.hoisted(() => ({ listAvailableVersions: vi.fn() }));

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/store/contents.store", () => ({ onContentSettled: vi.fn() }));
vi.stubGlobal("window", Object.assign(window, { engine: { listAvailableVersions } }));

import { defaultEngineInstalled, enginesStore, refreshEnginesStore, selectEngineVersion } from "@renderer/store/engine.store";

const OLDER = "2025.01.5";
const NEWER = "2026.10.1";

function engine(id: string, installed: boolean): EngineVersion {
    return { id, ais: [], installed } as EngineVersion;
}

// Available versions arrive oldest first, which is what "newest installed" leans on.
function available(...versions: EngineVersion[]) {
    listAvailableVersions.mockResolvedValue(versions);
}

describe("engine version selection", () => {
    beforeEach(async () => {
        listAvailableVersions.mockReset();
        selectEngineVersion(undefined);
        enginesStore.availableEngineVersions = [];
    });

    it("prefers the default version once it is installed", async () => {
        available(engine(OLDER, true), engine(DEFAULT_ENGINE_VERSION, true), engine(NEWER, true));

        await refreshEnginesStore();

        expect(enginesStore.selectedEngineVersion?.id).toBe(DEFAULT_ENGINE_VERSION);
        expect(defaultEngineInstalled.value).toBe(true);
    });

    // A client whose default version was bumped while the player was away still has a working engine.
    it("falls back to the newest installed engine when the default is not installed", async () => {
        available(engine(OLDER, true), engine(DEFAULT_ENGINE_VERSION, false));

        await refreshEnginesStore();

        expect(enginesStore.selectedEngineVersion?.id).toBe(OLDER);
        expect(defaultEngineInstalled.value).toBe(false);
    });

    // Selection has to follow the refreshed list, not hold an object from an earlier one.
    it("sees the default become installed without anything re-selecting it", async () => {
        available(engine(DEFAULT_ENGINE_VERSION, false));
        await refreshEnginesStore();
        expect(enginesStore.selectedEngineVersion?.installed).toBe(false);

        available(engine(DEFAULT_ENGINE_VERSION, true));
        await refreshEnginesStore();

        expect(enginesStore.selectedEngineVersion?.installed).toBe(true);
    });

    it("keeps an explicit choice ahead of the default", async () => {
        available(engine(OLDER, true), engine(DEFAULT_ENGINE_VERSION, true));
        await refreshEnginesStore();

        selectEngineVersion(engine(OLDER, true));

        expect(enginesStore.selectedEngineVersion?.id).toBe(OLDER);
    });

    it("drops an explicit choice that is no longer installed", async () => {
        available(engine(OLDER, true), engine(DEFAULT_ENGINE_VERSION, true));
        await refreshEnginesStore();
        selectEngineVersion(engine(OLDER, true));

        available(engine(OLDER, false), engine(DEFAULT_ENGINE_VERSION, true));
        await refreshEnginesStore();

        expect(enginesStore.selectedEngineVersion?.id).toBe(DEFAULT_ENGINE_VERSION);
    });

    it("reports the default version even when nothing is installed", async () => {
        available(engine(DEFAULT_ENGINE_VERSION, false));

        await refreshEnginesStore();

        expect(enginesStore.selectedEngineVersion?.id).toBe(DEFAULT_ENGINE_VERSION);
    });
});
