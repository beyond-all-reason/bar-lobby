declare const __static: string;

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
    export default component;
}

declare module "vue3-markdown-it";
declare module "vue3-popper";

declare module "*.png";
declare module "*.mp3";
declare module "*.ogg";
declare module "*.mp4";
