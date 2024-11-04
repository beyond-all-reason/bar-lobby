import { DirectiveBinding, Directive } from "vue";

const vStartPos: Directive = {
    // // Called when the bound element is mounted to the DOM
    mounted(el: HTMLElement, binding: DirectiveBinding) {
        const { x, y } = binding.value[0] as { x: number; y: number };
        const mapWidthElmos = binding.value[1] as number;
        const mapHeightElmos = binding.value[2] as number;
        const left = x / mapWidthElmos;
        const top = y / mapHeightElmos;
        el.style.left = `${left * 100}%`;
        el.style.top = `${top * 100}%`;
        el.classList.remove("right");
        el.classList.remove("left");
        if (left < 0.2) {
            el.classList.add("left");
        }
        if (left > 0.8) {
            el.classList.add("right");
        }
        if (top < 0.2) {
            if (left < 0.5) {
                el.classList.add("left");
            } else {
                el.classList.add("right");
            }
        }
    },
    updated(el: HTMLElement, binding: DirectiveBinding) {
        console.log("updated");
        console.log(binding.value);

        const { x, y } = binding.value[0] as { x: number; y: number };
        const mapWidthElmos = binding.value[1] as number;
        const mapHeightElmos = binding.value[2] as number;
        const left = x / mapWidthElmos;
        const top = y / mapHeightElmos;
        el.style.left = `${left * 100}%`;
        el.style.top = `${top * 100}%`;
        el.classList.remove("right");
        el.classList.remove("left");
        if (left < 0.2) {
            el.classList.add("left");
        }
        if (left > 0.8) {
            el.classList.add("right");
        }
        if (top < 0.2) {
            if (left < 0.5) {
                el.classList.add("left");
            } else {
                el.classList.add("right");
            }
        }
    },
    // unmounted(el: HTMLElement) {
    //     el.style.left = "";
    //     el.style.top = "";
    //     el.classList.remove("left");
    //     el.classList.remove("right");
    // },
};

export default vStartPos;
