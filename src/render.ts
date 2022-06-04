import "vue-next-select/dist/index.css";
import "vue-slider-component/theme/default.css";
import "@/assets/styles/styles.scss";

import type { TransitionProps } from "vue";
import { createApp } from "vue";

import { apiInit } from "@/api/api";
import App from "@/App.vue";
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

    window.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
        }
    });

    window.addEventListener("beforeunload", async (event) => {
        console.debug("beforeunload", event);
        event.preventDefault();
        if (api.comms.isConnected()) {
            await api.comms.request("c.auth.disconnect", {});
        }
        return event;
    });

    window.addEventListener("error", (event) => {
        console.debug("onerror", event);
        api.alerts.alert({
            type: "notification",
            severity: "error",
            content: event.message,
            timeoutMs: 5000,
        });
    });

    window.addEventListener("unhandledrejection", function (event) {
        console.debug("unhandledrejection", event);
        api.alerts.alert({
            type: "notification",
            severity: "error",
            content: event.reason,
            timeoutMs: 5000,
        });
    });
})();

async function setupVue() {
    const app = createApp(App);

    app.use(api.router);

    app.directive("click-away", clickAwayDirective);
    app.mount("#app");

    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
    }
}
