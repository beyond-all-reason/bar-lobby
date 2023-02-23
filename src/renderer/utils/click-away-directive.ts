// https://vuejs.org/guide/reusability/custom-directives.html#introduction

/**
 * arg is unique id that can be used to prevent the callback from being called on other elements
 *
 * TODO:
 * - add options for left click, right click, double click
 */

import { Directive, DirectiveBinding } from "vue";

type ClickAwayDirectiveOptions = {
    left: boolean;
    right: boolean;
    double: boolean;
};

const UNIQUE_ID = "__vue_click_away__";

const idElements: Map<string, Set<HTMLElement>> = new Map();

function mounted(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.arg) {
        if (idElements.has(binding.arg)) {
            idElements.get(binding.arg)?.add(el);
        } else {
            idElements.set(binding.arg, new Set([el]));
        }
    }

    el[UNIQUE_ID] = (event: MouseEvent) => {
        if (!event.target) {
            return;
        }

        if (!el) {
            return;
        }

        if (!binding.value) {
            return;
        }

        if (typeof binding.value !== "function") {
            return;
        }

        let elements = new Set([el]);
        const otherElements = binding.arg && idElements.get(binding.arg);
        if (otherElements) {
            elements = otherElements;
        }

        for (const element of elements) {
            if (element.contains(event.target as HTMLElement)) {
                return;
            }
        }

        return binding.value.call(binding.instance, event);
    };

    document.addEventListener("click", el[UNIQUE_ID], false);
    document.addEventListener("contextmenu", el[UNIQUE_ID], false);
}

function unmounted(el: HTMLElement, binding: DirectiveBinding) {
    document.removeEventListener("click", el[UNIQUE_ID], false);
    document.removeEventListener("contextmenu", el[UNIQUE_ID], false);

    delete el[UNIQUE_ID];

    if (binding.arg) {
        const set = idElements.get(binding.arg);
        if (set) {
            set.delete(el);
        }
    }
}

export const clickAwayDirective: Directive = { mounted, unmounted };
