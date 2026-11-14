// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, onActivated, onDeactivated, onUnmounted, ref, watch, type Ref } from "vue";

// Each modal dims and blurs what is behind it, and stacked those compound into something
// nothing is legible through, so only the bottom-most open one draws it.
const stack = ref<number[]>([]);
let nextId = 0;

export function useModalStack(isOpen: Ref<boolean>) {
    const id = nextId++;

    const enter = () => {
        if (!stack.value.includes(id)) stack.value.push(id);
    };

    const leave = () => (stack.value = stack.value.filter((entry) => entry !== id));

    watch(isOpen, (open) => (open ? enter() : leave()), { immediate: true });

    // A kept-alive scene takes its modal off screen without unmounting it or closing it,
    // so membership follows the teleported content rather than the component's lifetime.
    onActivated(() => isOpen.value && enter());
    onDeactivated(leave);
    onUnmounted(leave);

    return computed(() => stack.value[0] === id);
}
