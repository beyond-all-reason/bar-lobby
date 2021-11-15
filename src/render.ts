import { createApp } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { createRouterLayout } from "vue-router-layout";

import "@/assets/styles/styles.scss";
import routes from "@/routes";
import App from "@/App.vue";

setupVue();

async function setupVue() {
    const RouterLayout = createRouterLayout(layout => {
        return import("@/layouts/" + layout + ".vue");
    });

    const router = createRouter({
        history: process.env.IS_ELECTRON ? createWebHashHistory() : createWebHistory(process.env.BASE_URL),
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

    //app.use(createPinia());

    // app.config.globalProperties.window = window;
    // window.router = router;

    app.mount("#app");
}