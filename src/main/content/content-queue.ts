// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { removeFromArray } from "$/jaz-ts-utils/object";
import { ContentRef, contentRefKey, ContentType } from "@main/content/content-ref";
import { ContentReporter } from "@main/content/content-state";
import { downloadSlots } from "@main/content/download-slots";
import { logger } from "@main/utils/logger";

const log = logger("content-queue.ts");

export type ContentOperation = "acquire" | "remove";

export type ContentQueueEntry = ContentRef & {
    operation: ContentOperation;
    status: "queued" | "running";
};

type PendingOperation = {
    operation: ContentOperation;
    ref: ContentRef;
    resolve: () => void;
    reject: (error: unknown) => void;
};

function operationKey(operation: ContentOperation, ref: ContentRef) {
    return `${operation}:${contentRefKey(ref)}`;
}

// pr-downloader rewrites rapid's repo index on every invocation, maps included, so two of it at once
// land on the same repos.gz and one dies. It takes any number of assets per invocation instead and
// fetches them in parallel itself, which is where map concurrency comes from now. Engines come down
// over plain http and share nothing.
function usesPrd(ref: ContentRef) {
    return ref.type === "game" || ref.type === "map";
}

/**
 * Orders content operations and holds a download slot for each one it runs, so acquisitions share the
 * client's limit with everything else that downloads rather than having a private one.
 */
export class ContentQueue {
    public readonly onChanged: Signal<ContentQueueEntry[]> = new Signal();

    private readonly queued: PendingOperation[] = [];
    private readonly pending = new Map<string, Promise<void>>();
    private active: PendingOperation[] = [];

    public constructor(
        private readonly run: (operation: ContentOperation, type: ContentType, ids: string[], report: ContentReporter) => Promise<void>,
        private readonly isPresent: (ref: ContentRef) => boolean,
        private readonly report: ContentReporter = { progress: () => {}, attempt: () => {} }
    ) {}

    public snapshot(): ContentQueueEntry[] {
        return [
            ...this.active.map((entry) => ({ ...entry.ref, operation: entry.operation, status: "running" as const })),
            ...this.queued.map((entry) => ({ ...entry.ref, operation: entry.operation, status: "queued" as const })),
        ];
    }

    public enqueue(operation: ContentOperation, ref: ContentRef) {
        const key = operationKey(operation, ref);
        const inFlight = this.pending.get(key);
        if (inFlight) {
            return inFlight;
        }

        let resolve!: () => void;
        let reject!: (error: unknown) => void;
        const settled = new Promise<void>((resolveOperation, rejectOperation) => {
            resolve = resolveOperation;
            reject = rejectOperation;
        });

        this.pending.set(key, settled);
        this.queued.push({ operation, ref, resolve, reject });
        this.onChanged.dispatch(this.snapshot());

        // Deferred so a burst enqueued in the same tick is all visible before workers pick from it,
        // rather than the order depending on when each enqueue happened to land.
        queueMicrotask(() => this.drain());

        return settled;
    }

    // FIFO, skipping any ref already being worked on so a removal never overlaps an acquisition of the
    // same content, and any pr-downloader ref while another one is running.
    private takeNext() {
        const prdBusy = this.active.some((running) => usesPrd(running.ref));
        const index = this.queued.findIndex((entry) => {
            const sameRef = this.active.some((running) => contentRefKey(running.ref) === contentRefKey(entry.ref));

            return !sameRef && !(prdBusy && usesPrd(entry.ref));
        });

        return index === -1 ? undefined : this.queued.splice(index, 1)[0];
    }

    // One pr-downloader invocation is the only way several of its assets download at once, so the rest
    // of the limit is spent here rather than on invocations that would only wait for this one. Each
    // extra ref costs a slot, which keeps the total downloading the same as it would have been.
    private takeBatchWith(first: PendingOperation) {
        const batch = [first];
        if (!usesPrd(first.ref)) {
            return batch;
        }

        while (downloadSlots.tryTake()) {
            const index = this.queued.findIndex((entry) => entry.operation === first.operation && entry.ref.type === first.ref.type);
            if (index === -1) {
                downloadSlots.give();

                return batch;
            }

            batch.push(...this.queued.splice(index, 1));
        }

        return batch;
    }

    private succeeded(entry: PendingOperation) {
        try {
            return this.isPresent(entry.ref) === (entry.operation === "acquire");
        } catch (err) {
            log.error(`Could not tell whether ${operationKey(entry.operation, entry.ref)} took effect`, err);

            return false;
        }
    }

    private drain() {
        while (downloadSlots.tryTake()) {
            const next = this.takeNext();
            if (!next) {
                downloadSlots.give();

                return;
            }

            void this.work(next);
        }
    }

    private async work(first: PendingOperation) {
        let next: PendingOperation | undefined = first;
        let held = 1;
        try {
            while (next) {
                // Nothing may await before this, or the next worker takeNext picks from a stale active
                // list and two operations on one ref can start together.
                const batch = this.takeBatchWith(next);
                held = batch.length;
                this.active.push(...batch);
                this.onChanged.dispatch(this.snapshot());

                const failure = await this.runBatch(batch);

                for (const entry of batch) {
                    // What is on disk afterwards decides the outcome rather than the transport's exit
                    // code, which can report success for content that never landed and the reverse.
                    removeFromArray(this.active, entry);
                    this.pending.delete(operationKey(entry.operation, entry.ref));

                    if (this.succeeded(entry)) {
                        entry.resolve();
                    } else {
                        const complaint = entry.operation === "acquire" ? "is still missing after acquiring it" : "is still installed after removing it";
                        entry.reject(failure ?? new Error(`${entry.ref.type} '${entry.ref.id}' ${complaint}`));
                    }
                }

                for (; held > 1; held--) {
                    downloadSlots.give();
                }

                this.onChanged.dispatch(this.snapshot());
                next = this.takeNext();
            }
        } finally {
            for (; held > 0; held--) {
                downloadSlots.give();
            }
            // Finishing may have unblocked work this worker was not allowed to pick up.
            this.drain();
        }
    }

    // pr-downloader abandons the whole invocation when one asset cannot be resolved, taking assets that
    // would have downloaded fine with it, so a failed batch is retried one at a time to find out which
    // of them was the problem.
    private async runBatch(batch: PendingOperation[]) {
        const { operation, ref } = batch[0];
        const ids = batch.map((entry) => entry.ref.id);

        try {
            await this.run(operation, ref.type, ids, this.report);

            return undefined;
        } catch (err) {
            if (batch.length === 1) {
                return err;
            }

            log.warn(`Batched ${operation} of ${batch.length} ${ref.type}s failed, retrying them separately`, err);
        }

        let failure: unknown;
        for (const id of ids) {
            try {
                await this.run(operation, ref.type, [id], this.report);
            } catch (err) {
                failure = err;
            }
        }

        return failure;
    }
}
