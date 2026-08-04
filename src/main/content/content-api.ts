// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { Downloader } from "@main/content/abstract-content";
import { ContentProvider } from "@main/content/content-provider";
import { ContentQueue, ContentQueueEntry } from "@main/content/content-queue";
import { ContentRef, contentRefKey, ContentType } from "@main/content/content-ref";
import { ContentReporter, ContentState } from "@main/content/content-state";
import { engineProvider } from "@main/content/engine/engine-provider";
import { compareEngineVersions } from "@main/content/engine/engine-version-order";
import { gameProvider } from "@main/content/game/game-provider";
import { mapProvider } from "@main/content/maps/map-provider";
import { findPrdBinary } from "@main/content/pr-downloader";
import { DEFAULT_ENGINE_VERSION } from "@main/config/default-versions";
import { logger } from "@main/utils/logger";

const log = logger("content-api.ts");

async function acquireReporting(downloader: Downloader, id: string, report: ContentReporter, acquire: () => Promise<unknown>) {
    const progress = downloader.onDownloadProgress.add(({ currentBytes, totalBytes, progress, phase }) => report.progress(id, { currentBytes, totalBytes, progress, phase }));
    const retry = downloader.onDownloadRetry.add(() => report.attempt(id));

    try {
        await acquire();
    } finally {
        downloader.onDownloadProgress.dispose(progress);
        downloader.onDownloadRetry.dispose(retry);
    }
}

class ContentAPI {
    private readonly providers: Record<ContentType, ContentProvider> = {
        engine: {
            type: "engine",
            init: () => engineProvider.init().then(() => undefined),
            reinit: () => engineProvider.reinit(),
            isPresent: (id) => engineProvider.isVersionInstalled(id),
            installed: () =>
                engineProvider.availableVersions
                    .values()
                    .filter((version) => version.installed)
                    .map((version) => version.id)
                    .toArray(),
            acquire: async (ids, report) => {
                for (const id of ids) {
                    await acquireReporting(engineProvider, id, report, () => engineProvider.downloadEngine(id));
                }
            },
            remove: async (ids) => {
                for (const id of ids) {
                    await engineProvider.uninstallVersion(id);
                }
            },
        },
        game: {
            type: "game",
            init: () => gameProvider.init().then(() => undefined),
            reinit: () => gameProvider.reinit(),
            isPresent: (id) => gameProvider.isVersionInstalled(id),
            installed: () => gameProvider.availableVersions.keys().toArray(),
            acquire: async (ids, report) => {
                for (const id of ids) {
                    await acquireReporting(gameProvider, id, report, () => gameProvider.downloadGame(id));
                }
            },
            remove: async (ids) => {
                for (const id of ids) {
                    await gameProvider.uninstallVersionById(id);
                }
            },
        },
        map: {
            type: "map",
            init: () => mapProvider.init().then(() => undefined),
            reinit: () => mapProvider.reinit(),
            isPresent: (id) => mapProvider.isVersionInstalled(id),
            installed: () =>
                Object.entries(mapProvider.mapNameFileNameLookup)
                    .filter(([, fileName]) => fileName !== undefined)
                    .map(([springName]) => springName),
            acquire: async (ids, report) => {
                for (const id of ids) {
                    await acquireReporting(mapProvider, id, report, () => mapProvider.downloadMap(id));
                }
            },
            remove: async (ids) => {
                for (const id of ids) {
                    await mapProvider.uninstallVersion(id);
                }
            },
        },
    };

    private readonly states = new Map<string, ContentState>();

    private readonly queue = new ContentQueue(
        (operation, type, ids, report) => {
            const provider = this.providers[type];
            if (!provider) {
                throw new Error(`No content provider for type '${type}'`);
            }

            return operation === "acquire" ? provider.acquire(ids, report) : provider.remove(ids);
        },
        (ref) => this.isPresent(ref),
        {
            progress: (id, progress) => this.updateAcquiring(id, (state) => ({ ...state, ...progress })),
            attempt: (id) => this.updateAcquiring(id, (state) => ({ ...state, attempts: state.attempts + 1 })),
        }
    );

    public readonly onChanged: Signal<ContentState[]> = new Signal();

    // Fires for refs that finished without failing, which is what anything caching "is this installed"
    // needs to hear. onChanged only ever describes work still outstanding.
    public readonly onSettled: Signal<ContentRef[]> = new Signal();

    // Only maps watch their directory today, so this is wired to that provider rather than described
    // on the interface. Anything else growing a watcher reports through the same signal.
    public readonly onPresenceChanged: Signal<{ ref: ContentRef; present: boolean }> = new Signal();

    public constructor() {
        this.queue.onChanged.add((entries) => this.syncFromQueue(entries));
        mapProvider.onMapAdded.add((springName) => this.onPresenceChanged.dispatch({ ref: { type: "map", id: springName }, present: true }));
        mapProvider.onMapDeleted.add((springName) => this.onPresenceChanged.dispatch({ ref: { type: "map", id: springName }, present: false }));
    }

    // Engine first: the game and map scans read the installed engines to calculate checksums.
    public async init() {
        await this.providers.engine.init();
        await Promise.all([this.providers.game.init(), this.providers.map.init()]);
    }

    public async reinit() {
        await this.providers.engine.reinit();
        await Promise.all([this.providers.game.reinit(), this.providers.map.reinit()]);
    }

    public installed(type: ContentType): ContentRef[] {
        return (this.providers[type]?.installed() ?? []).map((id) => ({ type, id }));
    }

    public engineVersions() {
        return engineProvider.availableVersions
            .values()
            .toArray()
            .sort((a, b) => compareEngineVersions(a.id, b.id));
    }

    public gameVersions() {
        return gameProvider.availableVersions.values().toArray();
    }

    public gameVersion(gameVersion: string) {
        return gameProvider.getVersion(gameVersion);
    }

    public state() {
        return [...this.states.values()];
    }

    // Everything except an engine is fetched by pr-downloader, which arrives as part of an engine. An
    // engine is not, so a missing downloader is fetched here rather than failing and leaving the user to
    // find the startup flow that would have done it. Checked without awaiting first, so the usual case
    // still enqueues in the same tick as the caller asked.
    public async ensure(refs: ContentRef[]) {
        if (this.missing(refs).some((ref) => ref.type !== "engine") && !findPrdBinary()) {
            log.info("No pr-downloader available, acquiring the default engine first");
            await this.ensure([{ type: "engine", id: DEFAULT_ENGINE_VERSION }]);
        }

        await Promise.all(this.missing(refs).map((ref) => this.track(this.queue.enqueue("acquire", ref), ref)));
    }

    // Not filtered by what is currently installed: a ref being acquired right now would look absent
    // and skip the queue, which is the one thing keeping the two operations from overlapping. The
    // queue settles a removal on the content being gone, so removing what was never there is fine.
    public async remove(refs: ContentRef[]) {
        await Promise.all(refs.map((ref) => this.track(this.queue.enqueue("remove", ref), ref)));
    }

    public isPresent(ref: ContentRef) {
        const provider = this.providers[ref.type];

        // Reached over IPC, so an unknown type is a caller bug rather than something to trust. Say
        // it is absent instead of throwing, otherwise one bad ref loses the answer for every ref.
        if (!provider) {
            log.warn(`Unknown content type '${ref.type}' for '${ref.id}', treating it as absent`);

            return false;
        }

        return provider.isPresent(ref.id);
    }

    public missing(refs: ContentRef[]) {
        return refs.filter((ref) => !this.isPresent(ref));
    }

    private async track(settled: Promise<void>, ref: ContentRef) {
        try {
            await settled;
        } catch (err) {
            const key = contentRefKey(ref);
            const existing = this.states.get(key);
            const failed: ContentState = { ...ref, currentBytes: 0, totalBytes: 0, progress: 0, attempts: 1, ...existing, status: "failed" };
            this.states.set(key, failed);
            this.onChanged.dispatch(this.state());

            log.error(`Gave up on ${key} after ${failed.attempts} attempt(s), ${failed.currentBytes} of ${failed.totalBytes} bytes`, err);

            throw err;
        }
    }

    private updateAcquiring(id: string, update: (state: ContentState) => ContentState) {
        const running = [...this.states.values()].find((state) => state.id === id && state.status === "acquiring");
        if (!running) {
            return;
        }

        this.states.set(contentRefKey(running), update(running));
        this.onChanged.dispatch(this.state());
    }

    private syncFromQueue(entries: ContentQueueEntry[]) {
        const outstanding = new Set(entries.map((entry) => contentRefKey(entry)));

        for (const entry of entries) {
            const key = contentRefKey(entry);
            const existing = this.states.get(key);
            const status = entry.status === "queued" ? "queued" : entry.operation === "acquire" ? "acquiring" : "removing";
            // Asking for content again is a fresh set of attempts, so a leftover failure does not carry
            // its count into the new request.
            const attempts = !existing || existing.status === "failed" ? 1 : existing.attempts;
            this.states.set(key, { currentBytes: 0, totalBytes: 0, progress: 0, ...existing, type: entry.type, id: entry.id, status, attempts });
        }

        // A failure is kept until the ref is asked for again, so the reason a download stopped does not
        // vanish the moment the queue moves on.
        const settled: ContentRef[] = [];
        for (const [key, state] of this.states) {
            if (!outstanding.has(key) && state.status !== "failed") {
                settled.push({ type: state.type, id: state.id });
                this.states.delete(key);
            }
        }

        this.onChanged.dispatch(this.state());

        if (settled.length > 0) {
            this.onSettled.dispatch(settled);
        }
    }
}

export const contentAPI = new ContentAPI();
