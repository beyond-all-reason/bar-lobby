// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import type { Info } from "@main/services/info.service";
import { editionFeatures } from "@shared/edition";

const getInfo = vi.fn(async () => ({ edition: "steam", features: editionFeatures("steam"), statePath: "/state", assetsPath: "/assets" }) as unknown as Info);

vi.stubGlobal("window", Object.assign(window, { info: { getInfo } }));

const { initInfosLogic } = await import("@renderer/logic/infos");
const { infosStore } = await import("@renderer/store/infos.store");

describe("initInfosLogic", () => {
    it("fills the store from main once", async () => {
        await initInfosLogic();
        await initInfosLogic();

        expect(getInfo).toHaveBeenCalledOnce();
        expect(infosStore.isInitialized).toBe(true);
        expect(infosStore.edition).toBe("steam");
        expect(infosStore.features).toEqual(editionFeatures("steam"));
    });
});
