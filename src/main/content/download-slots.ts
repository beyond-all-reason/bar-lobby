// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MAX_CONCURRENT_DOWNLOADS } from "@main/config/content-policy";

/**
 * How many downloads the client runs at once, counted across every transport.
 *
 * The limit cannot live in any one downloader: pr-downloader's own limit is per invocation and so says
 * nothing about how many invocations exist, and the pool archive and the app update never go through it
 * at all. What this bounds is invocations, not connections, so a game still fans out inside
 * pr-downloader by as much as it sees fit.
 */
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
