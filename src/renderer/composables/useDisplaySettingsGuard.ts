// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, onUnmounted, ref } from "vue";
import { settingsStore } from "@renderer/store/settings.store";

// A display setting can leave the window somewhere the user cannot reach the controls to
// undo it, so changes are kept only if confirmed. Driven by the controls rather than by
// watching the store, which the window also writes its own size into.
const GUARDED = ["fullscreen", "maximized", "windowWidth", "windowHeight", "displayIndex", "uiScale"] as const;

type Guarded = Pick<typeof settingsStore, (typeof GUARDED)[number]>;

const REVERT_AFTER_SECONDS = 10;

export function useDisplaySettingsGuard() {
    const secondsLeft = ref(0);
    const awaitingConfirmation = computed(() => secondsLeft.value > 0);

    // Keys a control moved, at the value held before the first unconfirmed change. Anything
    // absent is left alone on revert, which keeps a hand-resized window out of it.
    let pending: Partial<Guarded> = {};
    let countdown: ReturnType<typeof setInterval> | undefined;

    const snapshot = () => Object.fromEntries(GUARDED.map((key) => [key, settingsStore[key]])) as Guarded;

    // Controls emit on things that are not changes, a lost focus among them, so the
    // countdown starts only where a value actually moved.
    function apply(change: () => void) {
        const before = snapshot();
        change();

        const moved = GUARDED.filter((key) => before[key] !== settingsStore[key]);
        if (!moved.length) return;

        for (const key of moved) {
            if (!(key in pending)) pending[key] = before[key] as never;
        }
        secondsLeft.value = REVERT_AFTER_SECONDS;

        if (countdown) return;
        countdown = setInterval(() => {
            secondsLeft.value -= 1;
            if (secondsLeft.value <= 0) revert();
        }, 1000);
    }

    function stopCountdown() {
        clearInterval(countdown);
        countdown = undefined;
        secondsLeft.value = 0;
    }

    function keep() {
        pending = {};
        stopCountdown();
    }

    function revert() {
        Object.assign(settingsStore, pending);
        keep();
    }

    onUnmounted(stopCountdown);

    return { awaitingConfirmation, secondsLeft, apply, keep, revert };
}
