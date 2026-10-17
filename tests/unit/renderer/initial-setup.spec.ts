// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import InitialSetup from "@renderer/components/misc/InitialSetup.vue";
import type { EditionFeatures } from "@main/config/edition";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const standalone: EditionFeatures = { selfUpdate: true, downloadEngineAndGame: true, changeAssetsPath: true, assetsReadOnly: false, assetsBesideExecutable: false };
const steam: EditionFeatures = { selfUpdate: false, downloadEngineAndGame: false, changeAssetsPath: false, assetsReadOnly: true, assetsBesideExecutable: true };

const { setup, held } = vi.hoisted(() => {
    // Every label the component asked for, so a test can tell one was never shown even in passing.
    const setup = {
        requested: [] as string[],
        installedMaps: 0,
        hasEngine: true,
        hasGame: true,
        features: {} as EditionFeatures,
    };
    // Lets a test stop a step part way, so the label shown while it runs can be read.
    const held = new Map<string, { promise: Promise<void>; release: () => void }>();

    return { setup, held };
});

function hold(step: string) {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => (release = resolve));
    held.set(step, { promise, release });

    return () => {
        held.delete(step);
        release();
    };
}

const waitFor = (step: string) => held.get(step)?.promise;

vi.mock("@renderer/i18n", () => ({
    useTypedI18n: () => ({
        t: (key: string, params?: { step?: string }) => {
            setup.requested.push(key);

            return params?.step ? `${key}(${params.step})` : key;
        },
    }),
}));
vi.mock("@renderer/composables/useLocaleOptions", async () => {
    const { ref } = await import("vue");

    return { useLocaleOptions: () => ({ localeOptions: ref([]) }) };
});
vi.mock("@renderer/composables/useDownloadProgress", async () => {
    const { ref } = await import("vue");

    return { useDownloadProgress: () => ({ allDownloads: ref([]), totalDownloadPercent: ref(0), progressText: () => "" }) };
});
vi.mock("@renderer/audio/audio", () => ({ audioApi: { load: vi.fn() } }));
vi.mock("@renderer/assets/assetFiles", () => ({ backgroundImages: { only: "background.png" }, fontFiles: {} }));
vi.mock("@renderer/store/maps.store", () => ({
    initMapsStore: vi.fn(),
    syncMapsMetadata: async () => waitFor("sync"),
    fetchMissingMapImages: vi.fn(),
}));
vi.mock("@renderer/store/replays.store", () => ({ initReplaysStore: vi.fn() }));
vi.mock("@renderer/store/db", () => ({
    initDb: vi.fn(),
    db: { maps: { filter: () => ({ count: async () => setup.installedMaps }) } },
}));
vi.mock("@renderer/store/config.store", () => ({ configStore: { defaultMaps: ["Quicksilver"], latestGameVersion: "byar:test", defaultEngineVersion: "2025.01.3" } }));
vi.mock("@renderer/store/battle.store", () => ({ initBattleStore: vi.fn() }));
// Getters rather than computeds, which would cache whatever the first test installed.
vi.mock("@renderer/store/engine.store", () => ({
    defaultEngineInstalled: {
        get value() {
            return setup.hasEngine;
        },
    },
    installedEngineVersions: {
        get value() {
            return setup.hasEngine ? [{ id: "2025.01.3", installed: true, ais: [] }] : [];
        },
    },
}));
vi.mock("@renderer/store/game.store", () => ({
    downloadGame: vi.fn(),
    gameStore: {
        get availableGameVersions() {
            return setup.hasGame ? new Map([["byar:test", {}]]) : new Map();
        },
        selectedGameVersion: {},
    },
}));
vi.mock("@renderer/store/contents.store", () => ({ contentsStore: { inFlight: [] } }));
vi.mock("@renderer/store/settings.store", () => ({ settingsStore: { language: "en" } }));
vi.mock("@renderer/store/infos.store", () => ({
    infosStore: {
        get features() {
            return setup.features;
        },
    },
}));

const downloadMaps = vi.fn(async () => waitFor("download"));
const checkForUpdates = vi.fn(async () => {
    await waitFor("check");

    return false;
});
const downloadUpdate = vi.fn();
const downloadEngine = vi.fn();
const preloadPool = vi.fn();
const getCurrentAssetsPath = vi.fn(async () => "/assets");

vi.stubGlobal(
    "window",
    Object.assign(window, {
        barNavigation: { signalReady: vi.fn() },
        maps: { downloadMaps },
        engine: { downloadEngine },
        content: { preloadPool },
        paths: { getCurrentAssetsPath },
        autoUpdater: { checkForUpdates, downloadUpdate, installUpdates: vi.fn() },
    })
);

function mountSetup() {
    return mount(InitialSetup, {
        global: { stubs: { Button: { template: "<button><slot /></button>" }, Textbox: true, Loader: true, Progress: true, Select: true, Icon: true } },
    });
}

const status = (wrapper: ReturnType<typeof mountSetup>) => wrapper.get("h4").text();

describe("InitialSetup stage labels", () => {
    beforeEach(() => {
        setup.requested.length = 0;
        setup.installedMaps = 3;
        setup.hasEngine = true;
        setup.hasGame = true;
        setup.features = steam;
        held.clear();
        downloadMaps.mockClear();
        checkForUpdates.mockClear();
        downloadUpdate.mockClear();
    });

    it("says it is updating the map list, not downloading maps, while it syncs", async () => {
        const release = hold("sync");
        const wrapper = mountSetup();
        await flushPromises();

        expect(status(wrapper)).toBe("lobby.components.misc.initialSetup.updatingMapList");

        release();
        await flushPromises();

        expect(wrapper.emitted("complete")).toHaveLength(1);
    });

    // The bundled maps are already there on every launch, so this is what a Steam player sees each time.
    it("never says it is downloading maps when they are already installed", async () => {
        const wrapper = mountSetup();
        await flushPromises();

        expect(wrapper.emitted("complete")).toHaveLength(1);
        expect(downloadMaps).not.toHaveBeenCalled();
        expect(setup.requested).not.toContain("lobby.components.misc.initialSetup.downloadingMaps");
    });

    it("says it is downloading maps once it starts downloading them", async () => {
        setup.installedMaps = 0;
        const release = hold("download");
        const wrapper = mountSetup();
        await flushPromises();

        expect(downloadMaps).toHaveBeenCalledWith(["Quicksilver"]);
        expect(status(wrapper)).toBe("lobby.components.misc.initialSetup.downloadingMaps");

        release();
        await flushPromises();

        expect(wrapper.emitted("complete")).toHaveLength(1);
    });

    it("does not run the update stage where the client cannot update itself", async () => {
        mountSetup();
        await flushPromises();

        expect(checkForUpdates).not.toHaveBeenCalled();
    });

    it("says it is checking for updates, not downloading one, while it checks", async () => {
        setup.features = standalone;
        const release = hold("check");
        const wrapper = mountSetup();
        await flushPromises();

        expect(status(wrapper)).toBe("lobby.components.misc.initialSetup.checkingForUpdates");

        release();
        await flushPromises();

        expect(downloadUpdate).not.toHaveBeenCalled();
        expect(setup.requested).not.toContain("lobby.components.misc.initialSetup.downloadingUpdate");
        expect(wrapper.emitted("complete")).toHaveLength(1);
    });
});

describe("InitialSetup on an edition that does not download engines or games", () => {
    beforeEach(() => {
        setup.requested.length = 0;
        setup.installedMaps = 3;
        setup.hasEngine = true;
        setup.hasGame = true;
        setup.features = steam;
        held.clear();
        vi.clearAllMocks();
    });

    it("skips the engine and game stages", async () => {
        const wrapper = mountSetup();
        await flushPromises();

        expect(wrapper.emitted("complete")).toHaveLength(1);
        expect(downloadEngine).not.toHaveBeenCalled();
        expect(preloadPool).not.toHaveBeenCalled();
    });

    it.each([
        ["engine", { hasEngine: false, hasGame: true }],
        ["game", { hasEngine: true, hasGame: false }],
    ])("says the installation is incomplete when the %s is missing, without asking for a folder", async (_, installed) => {
        Object.assign(setup, installed);
        const wrapper = mountSetup();
        await flushPromises();

        expect(status(wrapper)).toBe("lobby.components.misc.initialSetup.installationIncomplete");
        expect(getCurrentAssetsPath).not.toHaveBeenCalled();
        expect(downloadEngine).not.toHaveBeenCalled();
        expect(downloadMaps).not.toHaveBeenCalled();
        expect(wrapper.emitted("complete")).toBeUndefined();
    });

    // Steam can only verify the game files once the client is closed, so retrying from here goes nowhere.
    it("offers only to quit when the installation is incomplete", async () => {
        setup.hasEngine = false;
        const close = vi.spyOn(window, "close").mockImplementation(() => {});
        const wrapper = mountSetup();
        await flushPromises();

        const buttons = wrapper.findAll("button");
        expect(buttons.map((button) => button.text())).toEqual(["lobby.components.misc.initialSetup.quitToDesktop"]);

        await buttons[0].trigger("click");

        expect(close).toHaveBeenCalledOnce();
        close.mockRestore();
    });
});

describe("InitialSetup on the standalone edition", () => {
    beforeEach(() => {
        setup.requested.length = 0;
        setup.hasEngine = false;
        setup.hasGame = false;
        setup.features = standalone;
        held.clear();
        vi.clearAllMocks();
    });

    it("asks where to put the game files when there is no engine", async () => {
        const wrapper = mountSetup();
        await flushPromises();

        expect(getCurrentAssetsPath).toHaveBeenCalledOnce();
        expect(setup.requested).toContain("lobby.components.misc.initialSetup.selectAssetsPathDescription");
        expect(setup.requested).not.toContain("lobby.components.misc.initialSetup.installationIncomplete");
        wrapper.unmount();
    });
});
