// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

// Everything the vi.mock factories touch has to be hoisted with them, otherwise the factories run
// before these bindings are initialised.
const { installed, acquired, removed, progress, retry, watcher, stubProvider } = vi.hoisted(() => {
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
    const acquired: string[] = [];
    const removed: string[] = [];
    const progress = { engine: fakeSignal(), game: fakeSignal(), map: fakeSignal() };
    const retry = { engine: fakeSignal(), game: fakeSignal(), map: fakeSignal() };
    const watcher = { added: fakeSignal(), deleted: fakeSignal() };

    return {
        installed,
        acquired,
        removed,
        progress,
        retry,
        watcher,
        stubProvider: (type: keyof typeof progress) => ({
            onDownloadProgress: progress[type],
            onDownloadRetry: retry[type],
            isVersionInstalled: (id: string) => installed.has(`${type}:${id}`),
            acquire: async (id: string) => {
                acquired.push(`${type}:${id}`);
                installed.add(`${type}:${id}`);
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

    return { engineProvider: { ...stub, downloadEngine: stub.acquire, uninstallVersion: stub.remove } };
});
vi.mock("@main/content/game/game-provider", () => {
    const stub = stubProvider("game");

    return { gameProvider: { ...stub, downloadGame: stub.acquire, uninstallVersionById: stub.remove } };
});
vi.mock("@main/content/maps/map-provider", () => {
    const stub = stubProvider("map");

    return {
        mapProvider: {
            ...stub,
            downloadMap: stub.acquire,
            uninstallVersion: stub.remove,
            onMapAdded: watcher.added,
            onMapDeleted: watcher.deleted,
            mapNameFileNameLookup: {},
        },
    };
});
vi.mock("@main/content/pr-downloader", () => ({
    findPrdBinary: () => (installed.values().some((key) => key.startsWith("engine:")) ? "/engine/pr-downloader" : undefined),
}));
vi.mock("@main/config/default-versions", () => ({ DEFAULT_ENGINE_VERSION: "2025.01.3" }));
vi.mock("@main/utils/logger", () => ({
    logger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { contentAPI } from "@main/content/content-api";
import { ContentRef } from "@main/content/content-ref";

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
    });

    it("skips refs that are already present", async () => {
        await contentAPI.ensure([{ type: "engine", id: "2025.01.3" }]);

        expect(acquired).toEqual([]);
    });

    it("acquires the default engine first when nothing can run pr-downloader yet", async () => {
        installed.clear();

        await contentAPI.ensure([{ type: "map", id: "Coast To Coast 1.3" }]);

        expect(acquired).toEqual(["engine:2025.01.3", "map:Coast To Coast 1.3"]);
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

        const acquiring = contentAPI.ensure([{ type: "map", id: "Tabula 1.0" }]);
        await Promise.resolve();
        progress.map.dispatch({ currentBytes: 5, totalBytes: 10, progress: 0.5 });
        await acquiring;

        contentAPI.onChanged.dispose(binding);

        expect(seen).toContain("acquiring:0.5");
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

        const acquiring = contentAPI.ensure([{ type: "map", id: "Archsimkats 1.4" }]);
        await Promise.resolve();
        retry.map.dispatch(undefined);
        retry.map.dispatch(undefined);
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

    it("runs a removal after an in-flight acquisition of the same ref rather than skipping it", async () => {
        const ref = { type: "map", id: "Glacier Pass 1.3" } as const;

        await Promise.all([contentAPI.ensure([ref]), contentAPI.remove([ref])]);

        expect(acquired).toEqual(["map:Glacier Pass 1.3"]);
        expect(removed).toEqual(["map:Glacier Pass 1.3"]);
        expect(contentAPI.isPresent(ref)).toBe(false);
    });
});
