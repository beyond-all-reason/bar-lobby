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

export const promptRef = shallowRef<Prompt<any>>();

export function prompt<C extends DefineComponent<any, any, any, any, any>>(options: PromptOptions<C>): Promise<ReturnType<C> | undefined> {
    return new Promise((resolve) => {
        promptRef.value = {
            ...options,
            close: () => {
                resolve(undefined);
                promptRef.value = undefined;
            },
            submit: () => {
                const returnValue = promptRef.value?.componentInstance?.returnValue();
                resolve(returnValue);
                promptRef.value = undefined;
            },
        };
    });
}
