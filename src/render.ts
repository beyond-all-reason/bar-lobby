import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";
import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";

import App from "@/App.vue";
import "@/assets/styles/styles.scss";
import routes from "@/routes";
import DefaultLayout from "@/layouts/default.vue";
import { apiInit } from "@/api/api";

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        transition?: string;
        offline?: boolean;
    }
}

(async () => {
    await apiInit();

    await setupVue();

    document.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
        }
    });
})();

async function setupVue() {
    const RouterLayout = createRouterLayout(async () => DefaultLayout);

    const router = createRouter({
        history: createWebHashHistory(),
        routes: [
            {
                path: "/",
                component: RouterLayout,
                children: routes
            }
        ]
    });

    const app = createApp(App);

    app.use(router);

    app.mount("#app");

    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
        (window as any).router = router;
    }
}