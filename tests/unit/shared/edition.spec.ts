// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { EditionRefusalError, editionFeatures, isEditionRefusal, parseEditionMetadata, resolveEdition } from "@shared/edition";

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
            changeAssetsPath: true,
            assetsReadOnly: false,
            assetsBesideExecutable: false,
            officialContent: false,
            customContent: true,
        });
    });

    it("turns off updating, engine and game downloads and moving the assets on steam, and reads official content", () => {
        expect(editionFeatures("steam")).toEqual({
            selfUpdate: false,
            downloadEngineAndGame: false,
            changeAssetsPath: false,
            assetsReadOnly: true,
            assetsBesideExecutable: true,
            officialContent: true,
            customContent: true,
        });
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

    it("does not take other failures for a refusal", () => {
        expect(isEditionRefusal(new Error("Error invoking remote method 'content:ensure': Error: Not enough free space"))).toBe(false);
        expect(isEditionRefusal("EditionRefusalError: content_bundled_with_install: engine:2099.12.1")).toBe(false);
    });
});
