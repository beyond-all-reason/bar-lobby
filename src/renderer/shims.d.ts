import "@total-typescript/ts-reset";

declare const __static: string;

/* eslint-disable */
declare module "*.vue" {
    import type { Component } from "vue";
    const component: Component<{}, {}, any>;
    export default component;
}

declare module "vue3-markdown-it";
declare module "vue3-popper";

declare module "*.png";
declare module "*.mp3";
declare module "*.ogg";
declare module "*.mp4";
