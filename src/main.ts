import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import routes from "vue-auto-routing";
import { createRouterLayout } from "vue-router-layout";

import "@/styles/styles.scss";
import store from "@/store";
import App from "@/App.vue";
import Icon from "@/components/common/Icon.vue";
import Panel from "@/components/common/Panel.vue";
import Button from "@/components/common/Button.vue";

disableMediaControls();
setupVue();

function setupVue() {
    const RouterLayout = createRouterLayout(layout => {
        return import("@/layouts/" + layout + ".vue");
    });
    
    const router = createRouter({
        history: createWebHashHistory(process.env.BASE_URL),
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

    app.component("Icon", Icon);
    app.component("Panel", Panel);
    app.component("Button", Button);

    app.mount("#app");
}

function disableMediaControls() {
    navigator.mediaSession.setActionHandler("play", function() { /* Code excerpted. */ });
    navigator.mediaSession.setActionHandler("pause", function() { /* Code excerpted. */ });
    navigator.mediaSession.setActionHandler("seekbackward", function() { /* Code excerpted. */ });
    navigator.mediaSession.setActionHandler("seekforward", function() { /* Code excerpted. */ });
    navigator.mediaSession.setActionHandler("previoustrack", function() { /* Code excerpted. */ });
    navigator.mediaSession.setActionHandler("nexttrack", function() { /* Code excerpted. */ });
}