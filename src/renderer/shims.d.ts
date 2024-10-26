declare const __static: string;

/* eslint-disable */
declare module "*.vue" {
    import type { Component } from "vue";
    const component: Component<{}, {}, any>;
    export default component;
}

declare module "*.png";
declare module "*.mp3";
declare module "*.ogg";
declare module "*.mp4";

declare module "tga";
