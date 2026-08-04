// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { removeFromArray } from "$/jaz-ts-utils/object";
import { MAX_CONCURRENT_DOWNLOADS } from "@main/config/content-policy";
import { ContentRef, contentRefKey, ContentType } from "@main/content/content-ref";
import { ContentReporter } from "@main/content/content-state";
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

/**
 * Owns how much content is acquired at once. The limit has to live here rather than in pr-downloader,
 * whose own limit is per invocation and so cannot describe a total across several of them.
 */
export class ContentQueue {
    public readonly onChanged: Signal<ContentQueueEntry[]> = new Signal();

    private readonly queued: PendingOperation[] = [];
    private readonly pending = new Map<string, Promise<void>>();
    private active: PendingOperation[] = [];
    private workers = 0;

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
        // which keeps the engine-first rule from being decided by whichever ref arrived first.
        queueMicrotask(() => this.drain());

        return settled;
    }

    // FIFO, skipping any ref already being worked on so a removal never overlaps an acquisition of the
    // same content.
    private takeNext() {
        const index = this.queued.findIndex((entry) => !this.active.some((running) => contentRefKey(running.ref) === contentRefKey(entry.ref)));

        return index === -1 ? undefined : this.queued.splice(index, 1)[0];
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
        while (this.workers < MAX_CONCURRENT_DOWNLOADS) {
            const next = this.takeNext();
            if (!next) {
                return;
            }

            this.workers++;
            void this.work(next);
        }
    }

    private async work(first: PendingOperation) {
        let next: PendingOperation | undefined = first;
        try {
            while (next) {
                // Nothing may await before this, or the next worker takeNext picks from a stale active
                // list and two operations on one ref can start together.
                this.active.push(next);
                this.onChanged.dispatch(this.snapshot());

                let failure: unknown;
                try {
                    await this.run(next.operation, next.ref.type, [next.ref.id], this.report);
                } catch (err) {
                    failure = err;
                }

                // What is on disk afterwards decides the outcome rather than the transport's exit code,
                // which can report success for content that never landed and the reverse.
                removeFromArray(this.active, next);
                this.pending.delete(operationKey(next.operation, next.ref));

                if (this.succeeded(next)) {
                    next.resolve();
                } else {
                    const complaint = next.operation === "acquire" ? "is still missing after acquiring it" : "is still installed after removing it";
                    next.reject(failure ?? new Error(`${next.ref.type} '${next.ref.id}' ${complaint}`));
                }

                this.onChanged.dispatch(this.snapshot());
                next = this.takeNext();
            }
        } finally {
            this.workers--;
            // Finishing may have unblocked work this worker was not allowed to pick up.
            this.drain();
        }
    }
}
