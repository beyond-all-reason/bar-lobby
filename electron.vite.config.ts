import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";

const nodeAlias = {
    "@main": resolve(__dirname, "src/main"),
    "@preload": resolve(__dirname, "src/preload"),
    $: resolve(__dirname, "vendor"),
};
const webAlias = {
    "@main": resolve(__dirname, "src/main"),
    "@preload": resolve(__dirname, "src/preload"),
    "@renderer": resolve(__dirname, "src/renderer"),
    $: resolve(__dirname, "vendor"),
};

export default defineConfig({
    main: {
        resolve: { alias: nodeAlias },
        build: {
            sourcemap: true,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, "src/main/main.ts"),
                    "parse-replay-worker": resolve(__dirname, "src/main/content/replays/parse-replay-worker.ts"),
                    "map-image-worker": resolve(__dirname, "src/main/content/maps/map-image-worker.ts"),
                },
            },
        },
        plugins: [externalizeDepsPlugin({ exclude: ["glob-promise"] })],
    },
    preload: {
        resolve: { alias: nodeAlias },
        build: {
            sourcemap: true,
            rollupOptions: {
                output: {
                    format: "cjs",
                    // It should not be split chunks.
                    inlineDynamicImports: true,
                    entryFileNames: "[name].js",
                    chunkFileNames: "[name].js",
                    assetFileNames: "[name].[ext]",
                },
            },
        },
        plugins: [externalizeDepsPlugin()],
    },
    renderer: {
        // root: "src/renderer", <-- default set by electron-vite. This scopes requests within the renderer folder.
        resolve: { alias: webAlias, preserveSymlinks: true },
        build: {
            sourcemap: true,
            assetsInlineLimit: (path: string) => {
                // TODO: Find actual fix for Vite inlining files causing `Content Security Policy directive` errors in the web view
                // This only fixes the cursor images, but there are others not loading.
                return path.includes("cursor") ? false : undefined;
            },
        },
        css: {
            modules: false,
            preprocessorOptions: {
                scss: {
                    api: "modern-compiler",
                    additionalData: `@use "@renderer/styles/_utils.scss";`,
                },
            },
        },
        plugins: [
            VueRouter({
                routesFolder: "src/renderer/views",
                dts: "src/renderer/typed-router.d.ts",
            }),
            vue(),
        ],
    },
});
