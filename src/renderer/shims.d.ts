import "@total-typescript/ts-reset";

/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />

declare const __static: string;

declare module "*.vue" {
    import type { Component } from "vue";
    // eslint-disable-next-line
    const component: Component<{}, {}, any>;
    export default component;
}

declare module "vue3-markdown-it";
declare module "vue3-popper";

declare module "*.svg";
declare module "*.png";
declare module "*.mp3";
declare module "*.ogg";
declare module "*.mp4";
