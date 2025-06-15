// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Directive, DirectiveBinding } from "vue";

type ObserveeConfig = {
    element: HTMLElement;
    out: boolean;
    once: boolean;
    callback: (element: HTMLElement) => void;
};

const observees: Map<HTMLElement, ObserveeConfig> = new Map();

const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        for (const [element, config] of observees) {
            if (!config.out && entry.isIntersecting) {
                config.callback(element);

                if (config.once) {
                    unmounted(config.element);
                }
            } else if (config.out && !entry.isIntersecting) {
                config.callback(element);

                if (config.once) {
                    unmounted(config.element);
                }
            }
        }
    }
});

function mounted(el: HTMLElement, binding: DirectiveBinding) {
    intersectionObserver.observe(el);
    setObservee(el, binding);
}

function unmounted(el: HTMLElement) {
    intersectionObserver.unobserve(el);
    observees.delete(el);
}

function updated(el: HTMLElement, binding: DirectiveBinding) {
    setObservee(el, binding);
}

function setObservee(el: HTMLElement, binding: DirectiveBinding) {
    observees.set(el, {
        element: el,
        callback: binding.value,
        once: binding.modifiers.once,
        out: binding.modifiers.out,
    });
}

export const elementInViewDirective: Directive = { mounted, unmounted, updated };
