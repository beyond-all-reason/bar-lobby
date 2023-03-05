import vue from "@vitejs/plugin-vue";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import path from "path";
import VueRouter from "unplugin-vue-router/vite";
import renderer from "vite-plugin-electron-renderer";

export default defineConfig({
    main: {
        resolve: {
            alias: {
                "@": path.join(__dirname, "src/main"),
                $: path.join(__dirname, "src/common"),
            },
        },
        build: {
            assetsDir: ".",
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes("env-paths")) {
                            return "env-paths";
                        }
                        return;
                    },
                },
            },
        },
        plugins: [externalizeDepsPlugin({ exclude: ["env-paths"] })],
    },
    renderer: {
        resolve: {
            alias: {
                "@": path.join(__dirname, "src/renderer"),
                $: path.join(__dirname, "src/common"),
            },
        },
        build: {
            assetsDir: ".",
            rollupOptions: {
                external: ["better-sqlite3"],
            },
            sourcemap: true,
        },
        optimizeDeps: {
            esbuildOptions: {
                target: "esnext",
            },
        },
        css: {
            modules: false,
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "@/assets/styles/_utils.scss";`,
                },
            },
        },
        plugins: [
            VueRouter({
                routesFolder: "src/renderer/views",
                dts: "src/renderer/typed-router.d.ts",
                importMode: "sync",
            }),
            vue(),
            renderer({
                nodeIntegration: true,
                optimizeDeps: {
                    include: [
                        { name: "path", type: "commonjs" },
                        { name: "fs", type: "commonjs" },
                        { name: "child_process", type: "commonjs" },
                        { name: "stream", type: "commonjs" },
                        { name: "os", type: "commonjs" },
                        { name: "node-fetch", type: "module" },
                        { name: "spring-map-parser", type: "commonjs" },
                        { name: "better-sqlite3", type: "commonjs" },
                        { name: "tachyon-client", type: "commonjs" },
                        { name: "octokit", type: "commonjs" },
                        { name: "axios", type: "commonjs" },
                        { name: "glob-promise", type: "commonjs" },
                    ],
                },
            }),
        ],
    },
});
