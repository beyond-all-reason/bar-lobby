import { createApp } from "vue";
import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import routes from "vue-auto-routing";
import { createRouterLayout } from "vue-router-layout";

import "@/styles/styles.scss";
import store from "@/store";
import App from "@/App.vue";

setupVue();

function setupVue() {
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
    app.use(store);

    app.mount("#app");
}