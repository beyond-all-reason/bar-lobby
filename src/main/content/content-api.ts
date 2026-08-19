// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { Downloader } from "@main/content/abstract-content";
import { ClaimSource } from "@main/content/content-claims";
import { ContentProvider } from "@main/content/content-provider";
import { ContentQueue, ContentQueueEntry } from "@main/content/content-queue";
import { ContentRef, contentRefKey, ContentType } from "@main/content/content-ref";
import { ContentPresence, ContentReporter, ContentState, isUnsettled } from "@main/content/content-state";
import { engineProvider } from "@main/content/engine/engine-provider";
import { compareEngineVersions } from "@main/content/engine/engine-version-order";
import { gameProvider } from "@main/content/game/game-provider";
import { mapProvider } from "@main/content/maps/map-provider";
import { contentUsage } from "@main/content/content-usage";
import { findPrdBinary } from "@main/content/pr-downloader";
import { CONTENT_RETENTION_DAYS, MIN_FREE_BYTES_TO_ACQUIRE } from "@main/config/content-policy";
import { configService } from "@main/services/config.service";
import { getAssetsPath } from "@main/config/app";
import { formatBytes, freeBytes } from "@main/utils/disk-space";
import { logger } from "@main/utils/logger";

const log = logger("content-api.ts");

// A provider dispatches progress for everything it is downloading on one signal, so acquisitions that
// run alongside each other hear the others and have to ignore what is not theirs. A pr-downloader batch
// is the only thing running on its provider and reports bytes for the whole set rather than per asset,
// so every ref in it gets the same figures.
async function acquireReporting(downloader: Downloader, ids: string[], report: ContentReporter, acquire: () => Promise<unknown>) {
    const isOurs = (infoId: string) => ids.length > 1 || infoId === ids[0];

    const progress = downloader.onDownloadProgress.add((info) => {
        if (!isOurs(info.id)) return;

        report.progress(ids, { currentBytes: info.currentBytes, totalBytes: info.totalBytes, progress: info.progress, phase: info.phase });
    });
    const retry = downloader.onDownloadRetry.add((info) => {
        if (!isOurs(info.id)) return;

        report.attempt(ids);
    });

    try {
        await acquire();
    } finally {
        downloader.onDownloadProgress.dispose(progress);
        downloader.onDownloadRetry.dispose(retry);
    }
}

/**
 * Owns acquiring, availability and removal of engines, games and maps: one queue, one concurrency limit,
 * one change stream, presence read from disk rather than remembered.
 *
 * Deliberately not everything that downloads. The pool archive is a bulk seed with no version and nothing
 * to remove, and it runs alone because setup awaits it before the game download. App updates come from
 * electron-updater. Neither is a ContentRef, so neither is queued, and both report on their own channel.
 */
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
                    await acquireReporting(engineProvider, [id], report, () => engineProvider.downloadEngine(id));
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
            acquire: (ids, report) => acquireReporting(gameProvider, ids, report, () => gameProvider.downloadGames(ids)),
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
            acquire: (ids, report) => acquireReporting(mapProvider, ids, report, () => mapProvider.downloadMaps(ids)),
            remove: async (ids) => {
                for (const id of ids) {
                    await mapProvider.uninstallVersion(id);
                }
            },
        },
    };

    private readonly states = new Map<string, ContentState>();
    private readonly claimSources: ClaimSource[] = [];

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
            progress: (ids, progress) => this.updateAcquiring(ids, (state) => ({ ...state, ...progress })),
            attempt: (ids) => this.updateAcquiring(ids, (state) => ({ ...state, attempts: state.attempts + 1 })),
        }
    );

    public readonly onChanged: Signal<ContentState[]> = new Signal();

    // Fires when the queue is done with a ref, whichever operation it was, carrying whether the content
    // is installed now. onChanged only ever describes work still outstanding.
    public readonly onSettled: Signal<ContentPresence[]> = new Signal();

    // Content appearing or going away without anyone asking, which only the maps directory is watched
    // for today. Anything else growing a watcher reports through the same signal.
    public readonly onPresenceChanged: Signal<ContentPresence> = new Signal();

    public constructor() {
        this.queue.onChanged.add((entries) => this.syncFromQueue(entries));
        mapProvider.onMapAdded.add((springName) => this.onPresenceChanged.dispatch({ type: "map", id: springName, present: true }));
        mapProvider.onMapDeleted.add((springName) => this.onPresenceChanged.dispatch({ type: "map", id: springName, present: false }));
    }

    // Engine first: the game and map scans read the installed engines to calculate checksums.
    public async init() {
        await this.providers.engine.init();
        await Promise.all([this.providers.game.init(), this.providers.map.init()]);
        await contentUsage.init();
    }

    public async reinit() {
        await this.providers.engine.reinit();
        await Promise.all([this.providers.game.reinit(), this.providers.map.reinit()]);
        await contentUsage.init();
    }

    public registerClaimSource(source: ClaimSource) {
        this.claimSources.push(source);
    }

    public lastUsed(ref: ContentRef) {
        return contentUsage.lastUsed(ref);
    }

    // Nothing is worth failing over a note about when content was last wanted, and the store is
    // missing entirely when content init failed, which is a state the app deliberately keeps running in.
    public async markUsed(refs: ContentRef[]) {
        try {
            await contentUsage.markUsed(refs);
        } catch (err) {
            log.warn(`Could not record usage for ${refs.map(contentRefKey).join(", ")}`, err);
        }
    }

    public allInstalled() {
        return (Object.keys(this.providers) as ContentType[]).flatMap((type) => this.installed(type));
    }

    /**
     * Removes installed content nothing claims and nothing has wanted inside the retention window.
     *
     * Unstamped content is unseen, not old: a sweep stamps it and keeps it.
     */
    public async sweep() {
        const claimed = new Set(this.claimSources.flatMap((source) => source.claims()).map((ref) => contentRefKey(ref)));
        const installed = this.allInstalled();
        await contentUsage.forgetAllExcept(installed);

        const cutoff = Date.now() - CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const unseen: ContentRef[] = [];
        const stale: ContentRef[] = [];

        for (const ref of installed) {
            if (claimed.has(contentRefKey(ref))) {
                continue;
            }
            // Local games are the user's own files sitting in the games directory, not something that
            // was acquired, so they are never ours to remove.
            if (ref.type === "game" && ref.id.endsWith(".sdd")) {
                continue;
            }

            const used = contentUsage.lastUsed(ref);
            if (!used) {
                unseen.push(ref);
            } else if (used.getTime() <= cutoff) {
                stale.push(ref);
            }
        }

        await this.markUsed(unseen);

        // pr-downloader comes out of an engine, so removing the last one takes away the means of ever
        // getting another. Keep the newest regardless of how long it has sat unused.
        const survivingEngines = installed.filter((ref) => ref.type === "engine" && !stale.some((victim) => contentRefKey(victim) === contentRefKey(ref)));
        if (survivingEngines.length === 0) {
            // Picked from the doomed engines themselves: engineVersions() also lists versions that are
            // not installed, so its newest can be one no sweep could have been about to remove.
            const newest = stale
                .filter((ref) => ref.type === "engine")
                .sort((a, b) => compareEngineVersions(a.id, b.id))
                .at(-1);

            if (newest) {
                stale.splice(stale.indexOf(newest), 1);
            }
        }

        if (stale.length === 0) {
            return [];
        }

        log.info(`Sweeping ${stale.length} unused content item(s): ${stale.map((ref) => contentRefKey(ref)).join(", ")}`);
        await this.remove(stale);

        return stale;
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
        if (this.missing(refs).length > 0) {
            await this.assertRoomToAcquire();
        }

        if (this.missing(refs).some((ref) => ref.type !== "engine") && !findPrdBinary()) {
            log.info("No pr-downloader available, acquiring the default engine first");
            await this.ensure([{ type: "engine", id: configService.getConfig().defaultEngineVersion }]);
        }

        const acquisitions = await Promise.allSettled(this.missing(refs).map((ref) => this.track(this.queue.enqueue("acquire", ref), ref)));

        // Stamped by what is on disk now rather than by what was asked for, so content that landed is
        // not left unrecorded because something else in the same call did not.
        await this.markUsed(refs.filter((ref) => this.isPresent(ref)));

        const failed = acquisitions.find((acquisition) => acquisition.status === "rejected");
        if (failed) {
            throw failed.reason;
        }
    }

    // Refusing up front beats a transport failing partway with whatever error the filesystem gave it.
    // A volume we cannot measure is not treated as full: being unable to check is not a reason to stop
    // someone downloading.
    private async assertRoomToAcquire() {
        const assetsPath = getAssetsPath();
        let free: number;

        try {
            free = await freeBytes(assetsPath);
        } catch (err) {
            log.warn(`Could not read free space for ${assetsPath}, continuing anyway`, err);

            return;
        }

        if (free < MIN_FREE_BYTES_TO_ACQUIRE) {
            throw new Error(`Not enough free space in ${assetsPath}: ${formatBytes(free)} available, ${formatBytes(MIN_FREE_BYTES_TO_ACQUIRE)} needed.`);
        }
    }

    // Not filtered by what is currently installed: a ref being acquired right now would look absent
    // and skip the queue, which is the one thing keeping the two operations from overlapping. The
    // queue settles a removal on the content being gone, so removing what was never there is fine.
    public async remove(refs: ContentRef[]) {
        this.assertAnEngineSurvives(refs);
        await Promise.all(refs.map((ref) => this.track(this.queue.enqueue("remove", ref), ref)));
    }

    // pr-downloader ships inside an engine, so a client with none cannot fetch a game or a map. Enforced
    // on the operation rather than left to each caller to remember.
    private assertAnEngineSurvives(refs: ContentRef[]) {
        const doomed = new Set(refs.filter((ref) => ref.type === "engine").map((ref) => contentRefKey(ref)));
        if (doomed.size === 0) {
            return;
        }

        // Engines already queued for removal are still installed but will not be, so they count as gone
        // here. Two calls looking only at what is installed would each find the other's engine and both
        // go ahead.
        for (const entry of this.queue.snapshot()) {
            if (entry.type === "engine" && entry.operation === "remove") {
                doomed.add(contentRefKey(entry));
            }
        }

        const surviving = this.installed("engine").filter((ref) => !doomed.has(contentRefKey(ref)));
        if (surviving.length === 0) {
            throw new Error("Refusing to remove the last installed engine: pr-downloader comes with it.");
        }
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

    // Dispatched once for the whole set: the figures describe one invocation, and sending them a ref at a
    // time makes listeners redraw for each one and briefly see the set disagreeing with itself.
    private updateAcquiring(ids: string[], update: (state: ContentState) => ContentState) {
        const running = [...this.states.values()].filter((state) => ids.includes(state.id) && state.status === "acquiring");
        if (running.length === 0) {
            return;
        }

        for (const state of running) {
            this.states.set(contentRefKey(state), update(state));
        }
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
        const settled: ContentPresence[] = [];
        for (const [key, state] of this.states) {
            if (!outstanding.has(key) && isUnsettled(state)) {
                const ref = { type: state.type, id: state.id };
                settled.push({ ...ref, present: this.isPresent(ref) });
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
