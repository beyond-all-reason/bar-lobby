// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

// Everything the vi.mock factories touch has to be hoisted with them, otherwise the factories run
// before these bindings are initialised.
const { installed, unresolvable, acquired, removed, progress, retry, watcher, disk, gate, used, usage, defaultEngine, stubProvider } = vi.hoisted(() => {
    type Listener = (data: unknown) => void;

    function fakeSignal() {
        const listeners: Listener[] = [];

        return {
            add: (callback: Listener) => {
                listeners.push(callback);

                return callback;
            },
            dispose: (binding: Listener) => {
                const index = listeners.indexOf(binding);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            },
            dispatch: (data: unknown) => listeners.forEach((listener) => listener(data)),
            get listenerCount() {
                return listeners.length;
            },
        };
    }

    const installed = new Set(["engine:2025.01.3", "game:Beyond All Reason test-1-abc", "map:Red Comet Remake 1.8"]);
    // Content the transport cannot resolve: it comes back reporting nothing wrong, having installed
    // nothing, which is what the queue settles against.
    const unresolvable = new Set<string>();
    const acquired: string[] = [];
    const removed: string[] = [];
    const progress = { engine: fakeSignal(), game: fakeSignal(), map: fakeSignal() };
    const retry = { engine: fakeSignal(), game: fakeSignal(), map: fakeSignal() };
    const watcher = { added: fakeSignal(), deleted: fakeSignal() };
    const disk = { free: () => Promise.resolve(500 * 1024 * 1024 * 1024) as Promise<number> };
    // Lets a test hold an acquisition open so it can observe the in-flight state without counting ticks.
    const gate: { held: Promise<void> | null } = { held: null };

    const used = new Map<string, Date>();
    const defaultEngine = "2025.01.3";
    const usage = {
        unwritable: false,
        init: async () => {},
        lastUsed: (ref: { type: string; id: string }) => used.get(`${ref.type}:${ref.id}`),
        markUsed: async (refs: { type: string; id: string }[], at = new Date()) => {
            if (usage.unwritable) {
                throw new Error("Content usage store has not been initialised.");
            }
            refs.forEach((ref) => used.set(`${ref.type}:${ref.id}`, at));
        },
        forgetAllExcept: async () => {},
    };

    return {
        installed,
        unresolvable,
        acquired,
        removed,
        progress,
        retry,
        watcher,
        disk,
        gate,
        used,
        usage,
        defaultEngine,
        stubProvider: (type: keyof typeof progress) => ({
            onDownloadProgress: progress[type],
            onDownloadRetry: retry[type],
            isVersionInstalled: (id: string) => installed.has(`${type}:${id}`),
            acquire: async (id: string) => {
                acquired.push(`${type}:${id}`);
                if (gate.held) {
                    await gate.held;
                }
                if (!unresolvable.has(`${type}:${id}`)) {
                    installed.add(`${type}:${id}`);
                }
            },
            // pr-downloader takes the whole set in one invocation, so the providers in front of it do too.
            acquireMany: async (ids: string[]) => {
                ids.forEach((id) => acquired.push(`${type}:${id}`));
                if (gate.held) {
                    await gate.held;
                }
                ids.filter((id) => !unresolvable.has(`${type}:${id}`)).forEach((id) => installed.add(`${type}:${id}`));
            },
            remove: async (id: string) => {
                removed.push(`${type}:${id}`);
                installed.delete(`${type}:${id}`);
            },
        }),
    };
});

vi.mock("@main/content/engine/engine-provider", () => {
    const stub = stubProvider("engine");

    return {
        engineProvider: {
            ...stub,
            downloadEngine: stub.acquire,
            uninstallVersion: stub.remove,
            init: async () => {},
            reinit: async () => {},
            // A live view of the shared set, so a test adding installed content is reflected here. The
            // default version is always listed, installed or not, the way checkIfDefaultIsNew seeds it.
            get availableVersions() {
                const versions = new Map(
                    [...installed].filter((key) => key.startsWith("engine:")).map((key) => [key.slice("engine:".length), { id: key.slice("engine:".length), installed: true, ais: [] }])
                );
                if (!versions.has(defaultEngine)) {
                    versions.set(defaultEngine, { id: defaultEngine, installed: false, ais: [] });
                }

                return versions;
            },
        },
    };
});
vi.mock("@main/content/game/game-provider", () => {
    const stub = stubProvider("game");

    return {
        gameProvider: {
            ...stub,
            downloadGame: stub.acquire,
            downloadGames: stub.acquireMany,
            uninstallVersionById: stub.remove,
            init: async () => {},
            reinit: async () => {},
            getVersion: () => undefined,
            get availableVersions() {
                return new Map([...installed].filter((key) => key.startsWith("game:")).map((key) => [key.slice("game:".length), {}]));
            },
        },
    };
});
vi.mock("@main/content/maps/map-provider", () => {
    const stub = stubProvider("map");

    return {
        mapProvider: {
            ...stub,
            downloadMap: stub.acquire,
            downloadMaps: stub.acquireMany,
            uninstallVersion: stub.remove,
            init: async () => {},
            reinit: async () => {},
            onMapAdded: watcher.added,
            onMapDeleted: watcher.deleted,
            get mapNameFileNameLookup() {
                return Object.fromEntries([...installed].filter((key) => key.startsWith("map:")).map((key) => [key.slice("map:".length), "file.sd7"]));
            },
        },
    };
});
vi.mock("@main/content/pr-downloader", () => ({
    findPrdBinary: () => (installed.values().some((key) => key.startsWith("engine:")) ? "/engine/pr-downloader" : undefined),
}));
vi.mock("@main/config/default-versions", () => ({ DEFAULT_ENGINE_VERSION: defaultEngine }));
vi.mock("@main/config/content-policy", () => ({ MAX_CONCURRENT_DOWNLOADS: 3, CONTENT_RETENTION_DAYS: 90, MIN_FREE_BYTES_TO_ACQUIRE: 2 * 1024 * 1024 * 1024 }));
vi.mock("@main/config/app", () => ({ getAssetsPath: () => "/assets" }));
vi.mock("@main/utils/disk-space", () => ({ freeBytes: () => disk.free(), formatBytes: (bytes: number) => `${bytes}B` }));
vi.mock("@main/content/content-usage", () => ({ contentUsage: usage }));
vi.mock("@main/utils/logger", () => ({
    logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@main/services/config.service", () => ({
    configService: {
        getConfig: () => ({
            defaultEngineVersion: "2026.07.04",
            rapidHost: "repos-cdn.beyondallreason.dev",
            rapidGame: "byar",
        }),
    },
}));

import { contentAPI } from "@main/content/content-api";
import { ContentRef } from "@main/content/content-ref";

function hold() {
    let release!: () => void;
    gate.held = new Promise<void>((resolve) => {
        release = resolve;
    });

    return () => {
        gate.held = null;
        release();
    };
}

async function untilAcquiring(id: string) {
    for (let tick = 0; tick < 100; tick++) {
        if (contentAPI.state().some((entry) => entry.id === id && entry.status === "acquiring")) {
            return;
        }
        await Promise.resolve();
    }

    throw new Error(`${id} never started acquiring`);
}

describe("contentAPI.missing", () => {
    it("returns only the refs that are not installed", () => {
        const refs: ContentRef[] = [
            { type: "engine", id: "2025.01.3" },
            { type: "engine", id: "2099.12.1" },
            { type: "game", id: "Beyond All Reason test-1-abc" },
            { type: "map", id: "Some Other Map 1.0" },
        ];

        expect(contentAPI.missing(refs)).toEqual([
            { type: "engine", id: "2099.12.1" },
            { type: "map", id: "Some Other Map 1.0" },
        ]);
    });

    it("reports an unknown content type as missing instead of throwing", () => {
        const refs = [
            { type: "engine", id: "2025.01.3" },
            { type: "aircraft", id: "who knows" },
            { type: "map", id: "Red Comet Remake 1.8" },
        ] as ContentRef[];

        expect(() => contentAPI.missing(refs)).not.toThrow();
        expect(contentAPI.missing(refs)).toEqual([{ type: "aircraft", id: "who knows" }]);
    });

    it("keeps the answer for good refs when a bad one is in the same batch", () => {
        const refs = [
            { type: "nonsense", id: "x" },
            { type: "engine", id: "2099.12.1" },
        ] as ContentRef[];

        expect(contentAPI.missing(refs)).toHaveLength(2);
    });
});

describe("contentAPI.ensure", () => {
    beforeEach(() => {
        acquired.length = 0;
        used.clear();
    });

    it("skips refs that are already present", async () => {
        await contentAPI.ensure([{ type: "engine", id: "2025.01.3" }]);

        expect(acquired).toEqual([]);
    });

    it("acquires the default engine first when nothing can run pr-downloader yet", async () => {
        installed.clear();

        await contentAPI.ensure([{ type: "map", id: "Coast To Coast 1.3" }]);

        expect(acquired).toEqual(["engine:2026.07.04", "map:Coast To Coast 1.3"]);
    });

    it("does not fetch an engine when one is already usable", async () => {
        installed.clear();
        installed.add("engine:2025.01.3");

        await contentAPI.ensure([{ type: "map", id: "Pale Sun 1.1" }]);

        expect(acquired).toEqual(["map:Pale Sun 1.1"]);
    });

    it("acquires every missing ref it is given", async () => {
        await contentAPI.ensure([
            { type: "map", id: "Tangerine 1.2" },
            { type: "game", id: "Beyond All Reason test-2-def" },
            { type: "engine", id: "2026.01.1" },
        ]);

        expect(acquired.sort()).toEqual(["engine:2026.01.1", "game:Beyond All Reason test-2-def", "map:Tangerine 1.2"]);
    });

    // A sibling failing says nothing about the content that did land, and unstamped content reads as
    // never seen by the sweep.
    it("records what landed even when something else in the same call failed", async () => {
        unresolvable.add("map:Never Resolves 1.0");

        const acquiring = contentAPI.ensure([
            { type: "map", id: "Stamp Me 1.0" },
            { type: "map", id: "Never Resolves 1.0" },
        ]);

        await expect(acquiring).rejects.toThrow();
        expect(contentAPI.lastUsed({ type: "map", id: "Stamp Me 1.0" })).toBeDefined();
        expect(contentAPI.lastUsed({ type: "map", id: "Never Resolves 1.0" })).toBeUndefined();
    });

    // contentAPI.init is allowed to fail and leave the app running, which leaves nothing to write usage
    // into. Content still downloads, so the caller must not be told it did not.
    it("still reports success when usage cannot be recorded", async () => {
        usage.unwritable = true;

        try {
            await expect(contentAPI.ensure([{ type: "map", id: "Unstampable 1.0" }])).resolves.toBeUndefined();
            expect(installed.has("map:Unstampable 1.0")).toBe(true);
        } finally {
            usage.unwritable = false;
        }
    });

    it("acquires a missing ref once even when asked for concurrently", async () => {
        const ref = { type: "map", id: "Comet Catcher Remake 1.8" } as const;

        await Promise.all([contentAPI.ensure([ref]), contentAPI.ensure([ref])]);

        expect(acquired).toEqual(["map:Comet Catcher Remake 1.8"]);
    });

    it("rejects a ref whose type has no provider rather than reporting success", async () => {
        await expect(contentAPI.ensure([{ type: "nope", id: "x" } as unknown as ContentRef])).rejects.toThrow("No content provider");
    });
});

describe("contentAPI change stream", () => {
    beforeEach(() => {
        acquired.length = 0;
    });

    function stateOf(id: string) {
        return contentAPI.state().find((entry) => entry.id === id);
    }

    it("attributes progress to the ref being acquired", async () => {
        const seen: string[] = [];
        const binding = contentAPI.onChanged.add((state) => {
            const entry = state.find((candidate) => candidate.id === "Tabula 1.0");
            if (entry) {
                seen.push(`${entry.status}:${entry.progress}`);
            }
        });

        const release = hold();
        const acquiring = contentAPI.ensure([{ type: "map", id: "Tabula 1.0" }]);
        await untilAcquiring("Tabula 1.0");
        progress.map.dispatch({ id: "Tabula 1.0", currentBytes: 5, totalBytes: 10, progress: 0.5 });
        release();
        await acquiring;

        contentAPI.onChanged.dispose(binding);

        expect(seen).toContain("acquiring:0.5");
    });

    // One signal carries every download the provider has in flight, so each ref filters for its own.
    // pr-downloader runs one at a time, so an engine alongside a map is the concurrency that is left.
    it("ignores progress belonging to another ref downloading at the same time", async () => {
        const release = hold();
        const acquiring = contentAPI.ensure([
            { type: "map", id: "Comet Catcher 1.2" },
            { type: "engine", id: "2025.06.21" },
        ]);
        await untilAcquiring("Comet Catcher 1.2");
        await untilAcquiring("2025.06.21");

        progress.map.dispatch({ id: "Comet Catcher 1.2", currentBytes: 90, totalBytes: 100, progress: 0.9 });
        progress.engine.dispatch({ id: "2025.06.21", currentBytes: 1, totalBytes: 1000, progress: 0.001 });

        expect(stateOf("Comet Catcher 1.2")?.progress).toBe(0.9);
        expect(stateOf("Comet Catcher 1.2")?.totalBytes).toBe(100);
        expect(stateOf("2025.06.21")?.progress).toBe(0.001);
        expect(stateOf("2025.06.21")?.totalBytes).toBe(1000);

        release();
        await acquiring;
    });

    // Three renderer stores decide what is installed from this, and a removal settles the same way an
    // acquisition does, so the direction has to come from the payload rather than be assumed.
    it("reports whether settled content is installed now", async () => {
        installed.add("engine:2025.01.3");
        const seen: Array<{ id: string; present: boolean }> = [];
        const binding = contentAPI.onSettled.add((refs) => seen.push(...refs.map((ref) => ({ id: ref.id, present: ref.present }))));

        await contentAPI.ensure([{ type: "map", id: "Sands Of War 1.0" }]);
        await contentAPI.remove([{ type: "map", id: "Sands Of War 1.0" }]);

        contentAPI.onSettled.dispose(binding);

        expect(seen).toEqual([
            { id: "Sands Of War 1.0", present: true },
            { id: "Sands Of War 1.0", present: false },
        ]);
    });

    it("forgets a ref once it has settled", async () => {
        await contentAPI.ensure([{ type: "map", id: "Otago 1.3" }]);

        expect(stateOf("Otago 1.3")).toBeUndefined();
    });

    it("stops listening for progress once a ref is done", async () => {
        await contentAPI.ensure([{ type: "map", id: "Kiwi Lagoon 1.1" }]);

        expect(progress.map.listenerCount).toBe(0);
    });

    it("counts attempts from one and raises it on each retry", async () => {
        const counts: number[] = [];
        const binding = contentAPI.onChanged.add((state) => {
            const entry = state.find((candidate) => candidate.id === "Archsimkats 1.4");
            if (entry) {
                counts.push(entry.attempts);
            }
        });

        const release = hold();
        const acquiring = contentAPI.ensure([{ type: "map", id: "Archsimkats 1.4" }]);
        await untilAcquiring("Archsimkats 1.4");
        retry.map.dispatch({ id: "Archsimkats 1.4" });
        retry.map.dispatch({ id: "Archsimkats 1.4" });
        release();
        await acquiring;

        contentAPI.onChanged.dispose(binding);

        expect(counts[0]).toBe(1);
        expect(Math.max(...counts)).toBe(3);
    });

    it("stops listening for retries once a ref is done", async () => {
        await contentAPI.ensure([{ type: "map", id: "Eye Of Horus 1.6" }]);

        expect(retry.map.listenerCount).toBe(0);
    });

    it("keeps a failure visible after the queue moves on", async () => {
        await expect(contentAPI.ensure([{ type: "nope", id: "boom" } as unknown as ContentRef])).rejects.toThrow();

        expect(stateOf("boom")?.status).toBe("failed");
    });

    it("starts a fresh attempt count when failed content is asked for again", async () => {
        const failing = { type: "nope", id: "again" } as unknown as ContentRef;

        await expect(contentAPI.ensure([failing])).rejects.toThrow();
        expect(stateOf("again")?.status).toBe("failed");

        await expect(contentAPI.ensure([failing])).rejects.toThrow();

        expect(stateOf("again")?.attempts).toBe(1);
    });
});

describe("contentAPI.remove", () => {
    beforeEach(() => {
        installed.clear();
        acquired.length = 0;
        removed.length = 0;
    });

    it("removes an installed ref", async () => {
        installed.add("map:Throne 1.6");

        await contentAPI.remove([{ type: "map", id: "Throne 1.6" }]);

        expect(removed).toEqual(["map:Throne 1.6"]);
        expect(contentAPI.isPresent({ type: "map", id: "Throne 1.6" })).toBe(false);
    });

    it("treats removing content that was never there as done", async () => {
        await expect(contentAPI.remove([{ type: "map", id: "never had it" }])).resolves.toBeUndefined();
    });

    // pr-downloader ships inside an engine, so the client needs one left to fetch anything else.
    it("refuses to remove the last installed engine", async () => {
        installed.add("engine:2025.01.3");

        await expect(contentAPI.remove([{ type: "engine", id: "2025.01.3" }])).rejects.toThrow("last installed engine");
        expect(removed).toEqual([]);
        expect(installed.has("engine:2025.01.3")).toBe(true);
    });

    // Two removals in flight at once each looked at what was installed and each saw the other's engine,
    // so both went ahead and nothing was left to run pr-downloader.
    it("refuses a second removal that would take the engine the first one leaves", async () => {
        installed.add("engine:2025.01.2");
        installed.add("engine:2025.01.3");

        const first = contentAPI.remove([{ type: "engine", id: "2025.01.2" }]);

        await expect(contentAPI.remove([{ type: "engine", id: "2025.01.3" }])).rejects.toThrow("last installed engine");
        await first;
        expect(installed.has("engine:2025.01.3")).toBe(true);
    });

    it("refuses a batch that would take every engine at once", async () => {
        installed.add("engine:2025.01.2");
        installed.add("engine:2025.01.3");

        await expect(
            contentAPI.remove([
                { type: "engine", id: "2025.01.2" },
                { type: "engine", id: "2025.01.3" },
            ])
        ).rejects.toThrow("last installed engine");
        expect(removed).toEqual([]);
    });

    it("removes an engine while another stays installed", async () => {
        installed.add("engine:2025.01.2");
        installed.add("engine:2025.01.3");

        await contentAPI.remove([{ type: "engine", id: "2025.01.2" }]);

        expect(removed).toEqual(["engine:2025.01.2"]);
    });

    // Which of the two goes first is not fixed, because ensure checks free space before it enqueues.
    // What matters is that neither is dropped for looking unnecessary at the moment it was asked for.
    it("runs both a removal and an acquisition of the same ref rather than skipping either", async () => {
        // An engine has to be installed or ensure fetches one first to get hold of pr-downloader.
        installed.add("engine:2025.01.3");
        const ref = { type: "map", id: "Glacier Pass 1.3" } as const;

        await Promise.all([contentAPI.ensure([ref]), contentAPI.remove([ref])]);

        expect(acquired).toEqual(["map:Glacier Pass 1.3"]);
        expect(removed).toEqual(["map:Glacier Pass 1.3"]);
    });
});

describe("contentAPI.sweep", () => {
    const ages = { fresh: new Date(), ancient: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) };

    beforeEach(() => {
        installed.clear();
        used.clear();
        acquired.length = 0;
        removed.length = 0;
    });

    it("stamps content it has never seen instead of removing it", async () => {
        installed.add("map:Never Seen 1.0");
        installed.add("engine:2025.01.3");

        expect(await contentAPI.sweep()).toEqual([]);
        expect(used.get("map:Never Seen 1.0")).toBeDefined();
    });

    it("removes content nothing wants that has aged out", async () => {
        installed.add("engine:2025.01.3");
        installed.add("map:Forgotten 1.0");
        used.set("map:Forgotten 1.0", ages.ancient);

        expect(await contentAPI.sweep()).toEqual([{ type: "map", id: "Forgotten 1.0" }]);
        expect(removed).toEqual(["map:Forgotten 1.0"]);
    });

    it("keeps content that was used recently", async () => {
        installed.add("engine:2025.01.3");
        installed.add("map:Recent 1.0");
        used.set("map:Recent 1.0", ages.fresh);

        expect(await contentAPI.sweep()).toEqual([]);
    });

    // The engine list carries versions that are not installed too, so its newest can be one that was
    // never a candidate for removal.
    it("keeps the last installed engine when the default is not the one installed", async () => {
        installed.add("engine:2025.01.2");
        used.set("engine:2025.01.2", ages.ancient);

        expect(await contentAPI.sweep()).toEqual([]);
        expect(removed).toEqual([]);
    });

    it("keeps the newest of several engines when all of them have aged out", async () => {
        installed.add("engine:2025.01.2");
        installed.add("engine:2025.01.3");
        used.set("engine:2025.01.2", ages.ancient);
        used.set("engine:2025.01.3", ages.ancient);

        expect(await contentAPI.sweep()).toEqual([{ type: "engine", id: "2025.01.2" }]);
    });

    it("keeps content a claim source is holding", async () => {
        installed.add("engine:2025.01.3");
        installed.add("map:Claimed 1.0");
        used.set("map:Claimed 1.0", ages.ancient);
        contentAPI.registerClaimSource({ name: "test", claims: () => [{ type: "map", id: "Claimed 1.0" }] });

        expect(await contentAPI.sweep()).toEqual([]);
    });

    it("never removes a local game", async () => {
        installed.add("engine:2025.01.3");
        installed.add("game:MyGame.sdd");
        used.set("game:MyGame.sdd", ages.ancient);

        expect(await contentAPI.sweep()).toEqual([]);
    });
});

describe("contentAPI free space", () => {
    beforeEach(() => {
        installed.clear();
        installed.add("engine:2025.01.3");
        acquired.length = 0;
        disk.free = () => Promise.resolve(500 * 1024 * 1024 * 1024);
    });

    it("refuses to start acquiring when the assets volume is nearly full", async () => {
        disk.free = () => Promise.resolve(100 * 1024 * 1024);

        await expect(contentAPI.ensure([{ type: "map", id: "Big Map 1.0" }])).rejects.toThrow("Not enough free space");
        expect(acquired).toEqual([]);
    });

    it("does not check when everything asked for is already installed", async () => {
        installed.add("map:Have It 1.0");
        disk.free = () => Promise.reject(new Error("should not be consulted"));

        await expect(contentAPI.ensure([{ type: "map", id: "Have It 1.0" }])).resolves.toBeUndefined();
    });

    it("carries on when free space cannot be read", async () => {
        disk.free = () => Promise.reject(new Error("ENOSYS"));

        await contentAPI.ensure([{ type: "map", id: "Unmeasurable 1.0" }]);

        expect(acquired).toEqual(["map:Unmeasurable 1.0"]);
    });
});
