// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it } from "vitest";
import type { Info } from "@main/services/info.service";
import type { EngineVersion } from "@main/content/engine/engine-version";
import type { GameVersion } from "@main/content/game/game-version";
import { t } from "@renderer/i18n";
import { editionLogic } from "@renderer/logic/edition";
import { infosActions } from "@renderer/store/infos.store";
import { mapsStore } from "@renderer/store/maps.store";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { Edition, editionFeatures } from "@shared/edition";

function asEdition(edition: Edition) {
    infosActions.set({ edition, features: editionFeatures(edition) } as Info);
}

describe("editionLogic.refusalMessageKey", () => {
    it("words a refused engine and game as missing from the Steam install", () => {
        const key = editionLogic.refusalMessageKey("content_bundled_with_install");

        expect(t(key, { content: "2099.12.1" }, 1)).toBe("2099.12.1 is missing. It comes with the Steam install: verify the integrity of the game files in Steam.");
        expect(t(key, { content: "2099.12.1, Beyond All Reason test-2-def" }, 2)).toBe(
            "2099.12.1, Beyond All Reason test-2-def are missing. They come with the Steam install: verify the integrity of the game files in Steam."
        );
    });

    it("words a refused map as unavailable in this edition", () => {
        const key = editionLogic.refusalMessageKey("content_unavailable_in_edition");

        expect(t(key, { content: "Quicksilver 1.2" }, 1)).toBe("Quicksilver 1.2 is not available in this edition.");
        expect(t(key, { content: "Quicksilver 1.2, Red Comet 1.8" }, 2)).toBe("Quicksilver 1.2, Red Comet 1.8 are not available in this edition.");
    });
});

describe("editionLogic.isUnavailable", () => {
    beforeEach(() => {
        mapsStore.availableMapNames = new Set(["Quicksilver 1.2"]);
        enginesStore.availableEngineVersions = [{ id: "2025.01.3", installed: true } as EngineVersion, { id: "2099.12.1", installed: false } as EngineVersion];
        gameStore.availableGameVersions = new Map([["Beyond All Reason test-1-abc", {} as GameVersion]]);
    });

    it("finds missing content unavailable where it cannot be acquired", () => {
        asEdition("steam");

        expect(editionLogic.isUnavailable({ type: "map", id: "Red Comet 1.8" })).toBe(true);
        expect(editionLogic.isUnavailable({ type: "engine", id: "2099.12.1" })).toBe(true);
        expect(editionLogic.isUnavailable({ type: "game", id: "Beyond All Reason test-2-def" })).toBe(true);
    });

    it("finds installed content available where nothing can be acquired", () => {
        asEdition("steam");

        expect(editionLogic.isUnavailable({ type: "map", id: "Quicksilver 1.2" })).toBe(false);
        expect(editionLogic.isUnavailable({ type: "engine", id: "2025.01.3" })).toBe(false);
        expect(editionLogic.isUnavailable({ type: "game", id: "Beyond All Reason test-1-abc" })).toBe(false);
    });

    it("finds nothing unavailable where missing content can be downloaded", () => {
        asEdition("standalone");

        expect(editionLogic.isUnavailable({ type: "map", id: "Red Comet 1.8" })).toBe(false);
        expect(editionLogic.isUnavailable({ type: "engine", id: "2099.12.1" })).toBe(false);
        expect(editionLogic.isUnavailable({ type: "game", id: "Beyond All Reason test-2-def" })).toBe(false);
    });
});
