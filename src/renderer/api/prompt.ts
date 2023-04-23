/* eslint-disable @typescript-eslint/no-explicit-any */

// inspired by https://github.com/rlemaigre/vue3-promise-dialog

import { Component, ComponentPublicInstance, DefineComponent, shallowRef } from "vue";

export type Prompt<C extends Component> = {
    component: C;
    title: string;
    onCancel?: () => void;
    close: () => void;
    submit: () => void;
    componentInstance?: ComponentPublicInstance<C>;
};

export type PromptOptions<C extends Component> = Omit<Prompt<C>, "close" | "submit" | "componentInstance">;

type BindingReturnType<C extends DefineComponent<any, any, any>> = C extends DefineComponent<any, infer X, any> ? (X extends { returnValue: () => infer Y } ? Y : never) : never;
type MethodReturnType<C extends DefineComponent<any, any, any, any, any>> = C extends DefineComponent<any, any, any, any, infer X> ? (X extends { returnValue: () => infer Y } ? Y : never) : never;
type ReturnType<C extends DefineComponent<any, any, any, any, any>> = BindingReturnType<C> extends never ? MethodReturnType<C> : BindingReturnType<C>;

export class PromptAPI {
    public readonly promptRef = shallowRef<Prompt<any>>();

    public open<C extends DefineComponent<any, any, any, any, any>>(options: PromptOptions<C>): Promise<ReturnType<C> | undefined> {
        return new Promise((resolve) => {
            this.promptRef.value = {
                ...options,
                close: () => {
                    resolve(undefined);
                    this.promptRef.value = undefined;
                },
                submit: () => {
                    const returnValue = this.promptRef.value?.componentInstance?.returnValue();
                    resolve(returnValue);
                },
            };
        });
    }
}
