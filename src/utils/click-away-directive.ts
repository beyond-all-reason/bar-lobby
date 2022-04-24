/* eslint-disable @typescript-eslint/no-explicit-any */
import { Directive, DirectiveBinding } from "vue";

const UNIQUE_ID = "__vue_click_away__";

const mounted = (el: any, binding: DirectiveBinding) => {
    unmounted(el);

    const callback = binding.value;

    let nextTick = false;
    setTimeout(() => {
        nextTick = true;
    }, 0);

    el[UNIQUE_ID] = (event: Event) => {
        if ((!el || !el.contains(event.target)) && callback && nextTick && typeof callback === "function") {
            return callback.call(binding.instance, event);
        }
    };

    document.addEventListener("click", el[UNIQUE_ID], false);
    document.addEventListener("contextmenu", el[UNIQUE_ID], false);
};

const unmounted = (el: any) => {
    document.removeEventListener("click", el[UNIQUE_ID], false);
    document.removeEventListener("contextmenu", el[UNIQUE_ID], false);
    delete el[UNIQUE_ID];
};

const updated = (el: any, binding: DirectiveBinding) => {
    if (binding.value === binding.oldValue) {
        return;
    }
    mounted(el, binding);
};

export const clickAwayDirective: Directive = { mounted, unmounted, updated };