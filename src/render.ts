import { createApp, TransitionProps } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";
import App from "@/App.vue";
import "@/assets/styles/styles.scss";
import routes from "@/routes";
import { apiInit } from "@/api/api";
import VueClickAway from "vue3-click-away";

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
        routes: routes
    });

    const app = createApp(App);

    app.use(router);

    app.use(VueClickAway);

    app.mount("#app");

    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
        (window as any).router = router;
    }
}