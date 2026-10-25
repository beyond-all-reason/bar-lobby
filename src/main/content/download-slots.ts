// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MAX_CONCURRENT_DOWNLOADS } from "@main/config/content-policy";

// Bounds invocations across every transport, not connections: a game is one slot and fans out inside
// prd. Cannot be prd's own limit, which is per invocation and which the pool archive never goes through.
class DownloadSlots {
    private taken = 0;
    private readonly waiting: (() => void)[] = [];

    public tryTake() {
        if (this.taken >= MAX_CONCURRENT_DOWNLOADS) {
            return false;
        }

        this.taken++;

        return true;
    }

    public take(): Promise<void> {
        if (this.tryTake()) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => this.waiting.push(resolve));
    }

    // Handed straight to whoever is waiting rather than counted down and re-taken, so a slot cannot be
    // claimed by a new arrival ahead of something already queued for it.
    public give() {
        const next = this.waiting.shift();
        if (next) {
            next();

            return;
        }

        this.taken--;
    }

    public async use<T>(work: () => Promise<T>): Promise<T> {
        await this.take();

        try {
            return await work();
        } finally {
            this.give();
        }
    }
}

export const downloadSlots = new DownloadSlots();
