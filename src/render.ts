import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";
import "@/assets/styles/styles.scss";

import type { TransitionProps } from "vue";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import { apiInit } from "@/api/api";
import App from "@/App.vue";
import routes from "@/routes";
import { clickAwayDirective } from "@/utils/click-away-directive";

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        offline?: boolean;
        empty?: boolean;
        blurBg?: boolean;
        transition?: TransitionProps;
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
    const router = createRouter({
        history: createWebHashHistory(),
        routes: routes,
    });

    const app = createApp(App);

    app.use(router);

    app.directive("click-away", clickAwayDirective);

    app.mount("#app");

    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).router = router;
    }
}
