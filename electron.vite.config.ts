import vue from "@vitejs/plugin-vue";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import path from "path";
import VueRouter from "unplugin-vue-router/vite";
import commonjs from "vite-plugin-commonjs";
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
        publicDir: "assets",
        resolve: {
            alias: {
                "@": path.join(__dirname, "src/renderer"),
                $: path.join(__dirname, "src/common"),
            },
            preserveSymlinks: true,
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
            include: ["tachyon-protocol"],
        },
        css: {
            modules: false,
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "@/styles/_utils.scss";`,
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
                resolve: {
                    // "better-sqlite3": {
                    //     type: "esm",
                    // },
                    ws: {
                        type: "esm",
                    },
                },
            }),
            commonjs({
                filter: (id) => {
                    const fileRegex = /precompiled.*validations\.js$/;
                    return fileRegex.test(id);
                },
            }),
        ],
    },
});
