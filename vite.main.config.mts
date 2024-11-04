import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

import path from "path";

// https://vitejs.dev/config
export default defineConfig({
    resolve: {
        alias: {
            "@main": path.join(__dirname, "src/main"),
            "@renderer": path.join(__dirname, "src/renderer"),
            "@preload": path.join(__dirname, "src/preload"),
            $: path.join(__dirname, "vendor"),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "src/main/main.ts"),
                "parse-replay-worker": path.resolve(__dirname, "src/main/content/replays/parse-replay-worker.ts"),
                "map-image-worker": path.resolve(__dirname, "src/main/content/maps/map-image-worker.ts"),
            },
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
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: "node_modules/7zip-bin/win/x64/7za.exe",
                    dest: "./win/x64/",
                },
                {
                    src: "node_modules/7zip-bin/linux/x64/7za",
                    dest: "./linux/x64/",
                },
            ],
        }),
    ],
});
