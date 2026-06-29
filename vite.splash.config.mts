import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    root: path.resolve(__dirname, "src/splash"),
    publicDir: path.resolve(__dirname, "src/renderer/assets/images"),
    resolve: {
        alias: {
            "@main": path.resolve(__dirname, "src/main"),
            "@renderer": path.resolve(__dirname, "src/renderer"),
            "@preload": path.resolve(__dirname, "src/preload"),
            "@splash": path.resolve(__dirname, "src/splash"),
            $: path.resolve(__dirname, "vendor"),
        },
    },
    build: {
        sourcemap: true,
        outDir: path.resolve(__dirname, ".vite/renderer/splash_window"),
        rollupOptions: {
            input: path.resolve(__dirname, "src/splash/index.html"),
        },
    },
    optimizeDeps: {
        entries: ["src/splash/**/*.ts", "src/splash/**/*.js"],
    },
});
