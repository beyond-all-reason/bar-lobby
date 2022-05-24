import { Signal } from "jaz-ts-utils";
import type { Ref } from "vue";
import { ref } from "vue";

export class ModalsAPI {
    public states: Map<string, Ref<boolean>> = new Map();
    public onPromptSubmit: Signal<Record<string, unknown>> = new Signal();
    public onPromptCancel: Signal<Record<string, unknown>> = new Signal();

    public register(id: string) {
        let state = this.states.get(id.toLowerCase());
        if (!state) {
            state = ref(false);
            this.states.set(id.toLowerCase(), state);
        }
        return state;
    }

    public unregister(id: string) {
        this.states.delete(id.toLowerCase());
    }

    public toggle(id: string): void {
        const state = this.states.get(id.toLowerCase());
        if (state) {
            state.value = !state.value;
        }
    }

    public close(id: string): void {
        const state = this.states.get(id.toLowerCase());
        if (state) {
            state.value = false;
        }
    }

    public open(id: string): void {
        const state = this.states.get(id.toLowerCase());
        if (state) {
            state.value = true;
        }
    }

    public get(id: string): Ref<boolean> {
        this.register(id);
        return this.states.get(id.toLowerCase())!;
    }

    public prompt(id: string): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            const onPromptSubmit = this.onPromptSubmit.add((data) => {
                onPromptSubmit.destroy();
                onPromptCancel.destroy();
                this.close(id);
                resolve(data);
            });

            const onPromptCancel = this.onPromptCancel.add(() => {
                onPromptSubmit.destroy();
                onPromptCancel.destroy();
                reject("cancel");
            });

            this.open(id);
        });
    }
}
