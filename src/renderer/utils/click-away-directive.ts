// https://vuejs.org/guide/reusability/custom-directives.html#introduction

/**
 * TODO:
 * - add options for left click, right click, double click
 * - add arg that represents a unique id so we can add it to element to be excluded
 */

import { Directive, DirectiveBinding } from "vue";

type ClickAwayDirectiveOptions = {
    left: boolean;
    right: boolean;
    double: boolean;
};

const UNIQUE_ID = "__vue_click_away__";

function mounted(el: HTMLElement, binding: DirectiveBinding) {
    unmounted(el);

    const callback = binding.value;

    el[UNIQUE_ID] = (event: MouseEvent) => {
        if (!event.target) {
            return;
        }

        if ((!el || !el.contains(event.target as Node)) && callback && typeof callback === "function") {
            return callback.call(binding.instance, event);
        }
    };

    document.addEventListener("click", el[UNIQUE_ID], false);
    document.addEventListener("contextmenu", el[UNIQUE_ID], false);
}

function unmounted(el: HTMLElement) {
    document.removeEventListener("click", el[UNIQUE_ID], false);
    document.removeEventListener("contextmenu", el[UNIQUE_ID], false);
    delete el[UNIQUE_ID];
}

function updated(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value === binding.oldValue) {
        return;
    }
    mounted(el, binding);
}

export const clickAwayDirective: Directive = { mounted, unmounted, updated };
