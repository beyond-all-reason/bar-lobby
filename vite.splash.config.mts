import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev
export default defineConfig({
    // 1. Force this config instance to look ONLY inside the splash directory
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
        // Out-directory needs to align with Electron-Forge's expectations
        outDir: path.resolve(__dirname, ".vite/renderer/splash_window"),
        rollupOptions: {
            // Relative to the 'root' defined above
            input: path.resolve(__dirname, "src/splash/index.html"),
        },
    },
    // 2. CRITICAL: Strictly restrict dependency optimization to vanilla JS/TS files in splash.
    // This stops this config from crawling your Vue renderer files.
    optimizeDeps: {
        entries: ["src/splash/**/*.ts", "src/splash/**/*.js"],
    },
});
