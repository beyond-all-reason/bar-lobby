import { createRouter, createWebHashHistory } from "vue-router";
import { routes, handleHotUpdate } from "vue-router/auto-routes";

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

if (import.meta.hot) {
    handleHotUpdate(router);
}
