import { Directive, DirectiveBinding } from "vue";

type ObserveeConfig = {
    element: Element;
    out: boolean;
    once: boolean;
    callback: () => void;
};

const observees: Map<Element, ObserveeConfig> = ((window as any).test = new Map());

const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        for (const [element, config] of observees) {
            if (!config.out && entry.isIntersecting) {
                config.callback();

                if (config.once) {
                    unmounted(config.element);
                }
            } else if (config.out && !entry.isIntersecting) {
                config.callback();

                if (config.once) {
                    unmounted(config.element);
                }
            }
        }
    }
});

function mounted(el: Element, binding: DirectiveBinding) {
    intersectionObserver.observe(el);
    setObservee(el, binding);
}

function unmounted(el: Element) {
    intersectionObserver.unobserve(el);
    observees.delete(el);
}

function updated(el: Element, binding: DirectiveBinding) {
    setObservee(el, binding);
}

function setObservee(el: Element, binding: DirectiveBinding) {
    observees.set(el, {
        element: el,
        callback: binding.value,
        once: binding.modifiers.once,
        out: binding.modifiers.out,
    });
}

export const elementInViewDirective: Directive = { mounted, unmounted, updated };
