import { Signal } from "jaz-ts-utils";
import { Ref } from "vue";
import { ref } from "vue";

import { FatalError } from "@/model/errors";

export class ModalsAPI {
    public states: Map<string, Ref<boolean>> = new Map();
    public onOpenSignals: Map<string, Signal> = new Map();
    public onSubmitSignals: Map<string, Signal> = new Map();
    public onCancelSignals: Map<string, Signal> = new Map();
    public onClosedSignals: Map<string, Signal> = new Map();

    public register(id: string) {
        let state = this.states.get(id.toLowerCase());
        if (!state) {
            state = ref(false);
            this.states.set(id.toLowerCase(), state);
            this.onOpenSignals.set(id, new Signal());
            this.onSubmitSignals.set(id, new Signal());
            this.onCancelSignals.set(id, new Signal());
            this.onClosedSignals.set(id, new Signal());
        }
        return state;
    }

    public open(id: string, data?: unknown): Promise<unknown> {
        return new Promise((resolve) => {
            const state = this.states.get(id.toLowerCase());
            if (state) {
                state.value = true;
            }

            this.onOpenSignals.get(id)!.dispatch(data);
        });
    }

    public close(id: string): void {
        const state = this.states.get(id.toLowerCase());
        if (state) {
            state.value = false;
        }

        this.onClosedSignals.get(id)?.dispatch();
    }

    public get(id: string): Ref<boolean> {
        this.register(id);
        return this.states.get(id.toLowerCase())!;
    }

    public onOpen(id: string): Signal {
        return this.onOpenSignals.get(id)!;
    }

    public onSubmit(id: string): Signal {
        return this.onSubmitSignals.get(id)!;
    }

    public onCancel(id: string): Signal {
        return this.onCancelSignals.get(id)!;
    }

    public onClosed(id: string): Signal {
        return this.onClosedSignals.get(id)!;
    }

    public prompt(id: string): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            const onPromptSubmit = this.onSubmitSignals.get(id)!.add((data) => {
                onPromptSubmit.destroy();
                onPromptCancel.destroy();
                this.close(id);
                resolve(data);
            });

            const onPromptCancel = this.onCancelSignals.get(id)!.add(() => {
                onPromptSubmit.destroy();
                onPromptCancel.destroy();
                reject("cancel");
            });

            this.open(id);
        });
    }

    public fatalError(error: FatalError): void {
        this.open("error", { ...error });
    }
}
