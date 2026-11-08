// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { canAcquireInEdition, EditionRefusalError, editionFeatures, isEditionRefusal, parseEditionMetadata, refusalFor, resolveEdition } from "@shared/edition";

describe("parseEditionMetadata", () => {
    it("reads the steam edition from the packaged metadata", () => {
        expect(parseEditionMetadata(JSON.stringify({ name: "bar-lobby", barEdition: "steam" }))).toBe("steam");
    });

    it("is standalone when the key is absent", () => {
        expect(parseEditionMetadata(JSON.stringify({ name: "bar-lobby" }))).toBe("standalone");
    });

    // A typo in a packaging config must not produce a build that can neither update nor download a game.
    it("is standalone for a value it does not know", () => {
        expect(parseEditionMetadata(JSON.stringify({ barEdition: "Steam" }))).toBe("standalone");
        expect(parseEditionMetadata(JSON.stringify({ barEdition: true }))).toBe("standalone");
    });

    it("is standalone when the metadata cannot be read or parsed", () => {
        expect(parseEditionMetadata(undefined)).toBe("standalone");
        expect(parseEditionMetadata("{ not json")).toBe("standalone");
        expect(parseEditionMetadata("null")).toBe("standalone");
    });
});

describe("resolveEdition", () => {
    const steamMetadata = JSON.stringify({ barEdition: "steam" });
    const plainMetadata = JSON.stringify({ name: "bar-lobby" });

    it("honours BAR_EDITION when unpackaged", () => {
        expect(resolveEdition({ isPackaged: false, packageJson: plainMetadata, envEdition: "steam" })).toBe("steam");
    });

    it("lets BAR_EDITION pick standalone over the metadata when unpackaged", () => {
        expect(resolveEdition({ isPackaged: false, packageJson: steamMetadata, envEdition: "standalone" })).toBe("standalone");
    });

    it("ignores BAR_EDITION when packaged", () => {
        expect(resolveEdition({ isPackaged: true, packageJson: plainMetadata, envEdition: "steam" })).toBe("standalone");
        expect(resolveEdition({ isPackaged: true, packageJson: steamMetadata, envEdition: "standalone" })).toBe("steam");
    });

    it("falls back to the metadata when BAR_EDITION is unset or unknown", () => {
        expect(resolveEdition({ isPackaged: false, packageJson: steamMetadata, envEdition: undefined })).toBe("steam");
        expect(resolveEdition({ isPackaged: false, packageJson: plainMetadata, envEdition: "premium" })).toBe("standalone");
    });

    it("reads the metadata when packaged", () => {
        expect(resolveEdition({ isPackaged: true, packageJson: steamMetadata, envEdition: undefined })).toBe("steam");
        expect(resolveEdition({ isPackaged: true, packageJson: undefined, envEdition: undefined })).toBe("standalone");
    });
});

describe("editionFeatures", () => {
    it("keeps every standalone capability", () => {
        expect(editionFeatures("standalone")).toEqual({
            selfUpdate: true,
            downloadEngineAndGame: true,
            downloadMaps: true,
            changeAssetsPath: true,
            assetsReadOnly: false,
            assetsBesideExecutable: false,
            customContent: true,
        });
    });

    it("turns off updating, engine, game and map downloads and moving the assets on steam", () => {
        expect(editionFeatures("steam")).toEqual({
            selfUpdate: false,
            downloadEngineAndGame: false,
            downloadMaps: false,
            changeAssetsPath: false,
            assetsReadOnly: true,
            assetsBesideExecutable: true,
            customContent: true,
        });
    });
});

describe("canAcquireInEdition", () => {
    it("acquires everything on standalone", () => {
        const features = editionFeatures("standalone");

        expect(["engine", "game", "map"].map((type) => canAcquireInEdition(features, type as "engine" | "game" | "map"))).toEqual([true, true, true]);
    });

    it("acquires nothing on steam", () => {
        const features = editionFeatures("steam");

        expect(["engine", "game", "map"].map((type) => canAcquireInEdition(features, type as "engine" | "game" | "map"))).toEqual([false, false, false]);
    });

    // Maps have their own switch, so turning map downloads back on does not depend on engines and games.
    it("follows downloadMaps for maps alone", () => {
        const features = { ...editionFeatures("steam"), downloadMaps: true };

        expect(canAcquireInEdition(features, "map")).toBe(true);
        expect(canAcquireInEdition(features, "engine")).toBe(false);
        expect(canAcquireInEdition(features, "game")).toBe(false);
    });
});

describe("refusalFor", () => {
    it("refuses an engine or game as bundled with the install and a map as unavailable", () => {
        expect(refusalFor("engine")).toBe("content_bundled_with_install");
        expect(refusalFor("game")).toBe("content_bundled_with_install");
        expect(refusalFor("map")).toBe("content_unavailable_in_edition");
    });
});

describe("isEditionRefusal", () => {
    it("recognises a refusal thrown in main", () => {
        expect(isEditionRefusal(new EditionRefusalError("content_bundled_with_install", "engine:2099.12.1"))).toBe(true);
    });

    // Electron rejects an invoke with a plain Error carrying the thrown error's name and message.
    it("recognises a refusal that has crossed IPC as a message", () => {
        const refusal = new EditionRefusalError("content_bundled_with_install", "engine:2099.12.1");

        expect(isEditionRefusal(new Error(`Error invoking remote method 'content:ensure': ${refusal}`))).toBe(true);
    });

    it("recognises a refused map", () => {
        const refusal = new EditionRefusalError("content_unavailable_in_edition", "map:Quicksilver 1.2");

        expect(isEditionRefusal(new Error(`Error invoking remote method 'content:ensure': ${refusal}`))).toBe(true);
    });

    it("does not take other failures for a refusal", () => {
        expect(isEditionRefusal(new Error("Error invoking remote method 'content:ensure': Error: Not enough free space"))).toBe(false);
        expect(isEditionRefusal("EditionRefusalError: content_bundled_with_install: engine:2099.12.1")).toBe(false);
    });
});
