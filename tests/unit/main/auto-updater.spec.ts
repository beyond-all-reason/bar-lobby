// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const { edition, updater } = vi.hoisted(() => ({
    // Swapped wholesale by each test.
    edition: { name: "standalone", features: {} as Record<string, boolean> },
    updater: {
        currentVersion: "1.0.0",
        on: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        quitAndInstall: vi.fn(),
    },
}));

vi.mock("electron", () => ({ app: { isPackaged: true } }));
vi.mock("electron-updater", () => ({ default: { autoUpdater: updater } }));
vi.mock("@main/config/edition", () => ({
    get EDITION() {
        return edition.name;
    },
    EDITION_FEATURES: edition.features,
}));

const { editionFeatures } = await vi.importActual<typeof import("@shared/edition")>("@shared/edition");
const { AutoUpdaterAPI } = await import("@main/content/auto-updater");

function asEdition(name: "standalone" | "steam") {
    edition.name = name;
    Object.assign(edition.features, editionFeatures(name));
}

describe("AutoUpdaterAPI", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        asEdition("standalone");
    });

    describe("on an edition that does not update itself", () => {
        beforeEach(() => asEdition("steam"));

        it("never asks electron-updater for anything", async () => {
            const api = await new AutoUpdaterAPI().init();

            expect(await api.checkForUpdates()).toBe(false);
            await api.downloadUpdate();
            api.installUpdates();
            api.quitAndInstall();

            expect(updater.checkForUpdates).not.toHaveBeenCalled();
            expect(updater.downloadUpdate).not.toHaveBeenCalled();
            expect(updater.quitAndInstall).not.toHaveBeenCalled();
        });
    });

    it("checks for updates in a packaged standalone build", async () => {
        updater.checkForUpdates.mockImplementation(() => {
            const [, onNotAvailable] = updater.on.mock.calls.find(([event]) => event === "update-not-available")!;
            onNotAvailable({ version: "1.0.0" });
        });
        const api = await new AutoUpdaterAPI().init();

        expect(await api.checkForUpdates()).toBe(false);
        expect(updater.checkForUpdates).toHaveBeenCalledOnce();
    });
});
