import { ref, Ref } from "vue";

export class ModalsAPI {
    public states: Map<string, Ref<boolean>> = new Map();

    public register(name: string) {
        let state = this.states.get(name.toLowerCase());
        if (!state) {
            state = ref(false);
            this.states.set(name.toLowerCase(), state);
        }
        return state;
    }

    public toggle(name: string): void {
        const state = this.states.get(name.toLowerCase());
        if (state) {
            state.value = !state.value;
        }
    }

    public close(name: string): void {
        const state = this.states.get(name.toLowerCase());
        if (state) {
            state.value = false;
        }
    }

    public open(name: string): void {
        const state = this.states.get(name.toLowerCase());
        if (state) {
            state.value = true;
        }
    }

    public get(name: string): Ref<boolean> {
        this.register(name);
        return this.states.get(name.toLowerCase())!;
    }
}