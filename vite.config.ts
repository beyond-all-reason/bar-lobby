import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            external: [/^(?!zod$|zod-to-json-schema$)/],
        },
    },
});
