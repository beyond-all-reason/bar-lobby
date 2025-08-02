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
        exclude: ["**/e2e/**"],
        workspace: [
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
                    setupFiles: ["tests/setup.renderer.mts"],
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
        ],
    },
    resolve: { alias },
});
