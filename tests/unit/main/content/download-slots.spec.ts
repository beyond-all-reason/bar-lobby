// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MAX_CONCURRENT_DOWNLOADS } from "@main/config/content-policy";
import { downloadSlots } from "@main/content/download-slots";
import { describe, expect, it } from "vitest";

function deferred() {
    let release!: () => void;
    const settled = new Promise<void>((resolve) => {
        release = resolve;
    });

    return { settled, release };
}

describe("downloadSlots", () => {
    it("hands out no more than the limit at once", async () => {
        let running = 0;
        let peak = 0;
        const gate = deferred();

        const all = Promise.all(
            Array.from({ length: MAX_CONCURRENT_DOWNLOADS + 3 }, () =>
                downloadSlots.use(async () => {
                    running++;
                    peak = Math.max(peak, running);
                    await gate.settled;
                    running--;
                })
            )
        );
        await Promise.resolve();

        gate.release();
        await all;

        expect(peak).toBe(MAX_CONCURRENT_DOWNLOADS);
    });

    it("lets a waiter through as soon as a slot is given back", async () => {
        const held = Array.from({ length: MAX_CONCURRENT_DOWNLOADS }, () => deferred());
        const running = held.map((gate) => downloadSlots.use(() => gate.settled));

        let admitted = false;
        const waiting = downloadSlots.use(async () => {
            admitted = true;
        });

        await Promise.resolve();
        expect(admitted).toBe(false);

        held[0].release();
        await waiting;

        expect(admitted).toBe(true);

        held.slice(1).forEach((gate) => gate.release());
        await Promise.all(running);
    });

    it("gives the slot back when the work throws", async () => {
        await expect(
            downloadSlots.use(() => {
                throw new Error("transport died");
            })
        ).rejects.toThrow("transport died");

        let ran = false;
        await downloadSlots.use(async () => {
            ran = true;
        });

        expect(ran).toBe(true);
    });

    it("admits waiters in the order they asked", async () => {
        const held = Array.from({ length: MAX_CONCURRENT_DOWNLOADS }, () => deferred());
        const running = held.map((gate) => downloadSlots.use(() => gate.settled));

        const order: string[] = [];
        const first = downloadSlots.use(async () => void order.push("first"));
        const second = downloadSlots.use(async () => void order.push("second"));

        held.forEach((gate) => gate.release());
        await Promise.all([first, second, ...running]);

        expect(order).toEqual(["first", "second"]);
    });
});
