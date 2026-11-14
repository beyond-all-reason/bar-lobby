import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig({
    resolve: {
        alias: {
            "@main": path.join(__dirname, "src/main"),
            "@renderer": path.join(__dirname, "src/renderer"),
            "@preload": path.join(__dirname, "src/preload"),
            "@shared": path.join(__dirname, "src/shared"),
            $: path.join(__dirname, "vendor"),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "src/main/main.ts"),
                "parse-replay-worker": path.resolve(__dirname, "src/main/replays/parse-replay-worker.ts"),
                "map-image-worker": path.resolve(__dirname, "src/main/content/maps/map-image-worker.ts"),
            },
            // 7zip-bin finds its binary from its own folder, so bundling it would point at the build output instead.
            external: ["fs/promises", "7zip-bin"],
        },
        lib: {
            entry: path.resolve(__dirname, "src/main/main.ts"),
            formats: ["cjs"],
            fileName(format, entryName) {
                return `${entryName}.cjs`;
            },
        },
        sourcemap: true,
    },
});
