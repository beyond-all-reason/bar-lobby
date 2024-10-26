import { defineConfig } from "vite";
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
        lib: {
            entry: path.resolve(__dirname, "src/preload/preload.ts"),
            formats: ["cjs"],
            fileName(format, entryName) {
                return `${entryName}.cjs`;
            },
        },
        sourcemap: true,
    },
});
