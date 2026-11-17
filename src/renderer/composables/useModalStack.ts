// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, onActivated, onDeactivated, onUnmounted, ref, watch, type Ref } from "vue";

// Open modals in the order they opened, so the last one is the one on top.
const stack = ref<number[]>([]);
let nextId = 0;

// Lets things that also close on Escape, like the battle lobby drawer, leave it to an open modal.
export const isAnyModalOpen = computed(() => stack.value.length > 0);

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

    return {
        // Each modal dims and blurs what is behind it, and stacked those compound into something
        // nothing is legible through, so only the bottom-most open one draws it.
        isBottom: computed(() => stack.value[0] === id),
        // Escape is one keypress, so only the modal on top answers it.
        isTop: computed(() => stack.value.at(-1) === id),
    };
}
