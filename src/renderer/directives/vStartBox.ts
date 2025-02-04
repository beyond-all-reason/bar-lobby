import { StartBox } from "tachyon-protocol/types";
import { DirectiveBinding, Directive } from "vue";

const vStartBox: Directive = {
    // Called when the bound element is mounted to the DOM
    mounted(el: HTMLElement, binding: DirectiveBinding<StartBox>) {
        if (!binding?.value) {
            return;
        }
        const { top, bottom, left, right } = binding.value;
        const width = Math.abs(right - left);
        const height = Math.abs(top - bottom);
        el.style.top = `${top * 100}%`;
        el.style.left = `${left * 100}%`;
        el.style.width = `${width * 100}%`;
        el.style.height = `${height * 100}%`;
    },
    updated(el: HTMLElement, binding: DirectiveBinding<StartBox>) {
        if (!binding?.value) {
            return;
        }
        const { top, bottom, left, right } = binding.value;
        const width = Math.abs(right - left);
        const height = Math.abs(top - bottom);
        el.style.top = `${top * 100}%`;
        el.style.left = `${left * 100}%`;
        el.style.width = `${width * 100}%`;
        el.style.height = `${height * 100}%`;
    },
    unmounted(el: HTMLElement) {
        el.style.top = "";
        el.style.left = "";
        el.style.width = "";
        el.style.height = "";
    },
};

export default vStartBox;
