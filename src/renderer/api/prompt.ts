import { DefineComponent, ref } from "vue";

export class PromptAPI {
    public promptContent = ref<DefineComponent<any, any, any, any, any>>();

    public async prompt<C extends DefineComponent<any, any, any, any, any>>(component: C) {
        return new Promise((resolve, reject) => {
            this.promptContent.value = component;
        });
    }

    public promptSubmit(data: any) {}
}
