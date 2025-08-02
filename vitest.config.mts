import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";
import path from "path";

const alias = {
    "@main": path.resolve(__dirname, "./src/main"),
    "@renderer": path.resolve(__dirname, "./src/renderer"),
    "@preload": path.resolve(__dirname, "./src/preload"),
    $: path.join(__dirname, "vendor"),
};

export default defineConfig({
    test: {
        globals: true,
        projects: [
            {
                test: {
                    name: "unit/main",
                    environment: "node",
                    setupFiles: ["tests/setup.main.mts"],
                    include: ["tests/unit/main/**/*.{test,spec}.{ts,mts}"],
                },
                resolve: { alias },
            },
            {
                test: {
                    name: "unit/renderer",
                    environment: "jsdom",
                    include: ["tests/unit/renderer/**/*.{test,spec}.{ts,mts}"],
                },
                resolve: { alias },
                plugins: [
                    vue(),
                    VueRouter({
                        routesFolder: "src/renderer/views",
                        dts: "src/renderer/typed-router.d.ts",
                    }),
                ],
            },
            {
                test: {
                    name: "unit/shared",
                    environment: "node",
                    setupFiles: ["tests/setup.main.mts"],
                    include: ["tests/unit/shared/**/*.{test,spec}.{ts,mts}"],
                },
                resolve: { alias },
            },
            {
                test: {
                    name: "integration/ipc",
                    environment: "node",
                    include: ["tests/integration/ipc/**/*.{test,spec}.{ts,mts}"],
                },
                resolve: { alias },
            },
        ],
    },
    resolve: { alias },
});
