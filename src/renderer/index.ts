import "node-self";
import "primevue/resources/primevue.min.css";
import "flag-icons/css/flag-icons.min.css";
import "primeicons/primeicons.css";
import "@/assets/styles/styles.scss";

import path from "path";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import type { TransitionProps } from "vue";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";

import { apiInit } from "@/api/api";
import App from "@/App.vue";
import { clickAwayDirective } from "@/utils/click-away-directive";
import { elementInViewDirective } from "@/utils/element-in-view-directive";

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        order?: number;
        availableOffline?: boolean;
        hide?: boolean;
        empty?: boolean;
        blurBg?: boolean;
        transition?: TransitionProps;
        overflowY?: "scroll" | "hidden";
        devOnly?: boolean;
    }
}

(async () => {
    await apiInit();

    await setupVue();

    api.router.replace("/");

    window.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
            api.settings.model.fullscreen = !api.settings.model.fullscreen;
        }
    });

    // window.addEventListener("beforeunload", async (event) => {
    //     console.debug("beforeunload", event);
    //     event.preventDefault();
    //     if (api.comms.isConnected.value) {
    //         //await api.comms.request("c.auth.disconnect", {});
    //         api.comms.disconnect();
    //     }
    //     return event;
    // });
})();

async function setupVue() {
    const app = createApp(App);

    app.use(api.router);
    app.use(PrimeVue, {
        ripple: true,
    });
    app.use(await setupI18n());

    app.directive("click-away", clickAwayDirective);
    app.directive("in-view", elementInViewDirective);
    app.directive("tooltip", Tooltip);

    app.mount("#app");

    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
    }
}

async function setupI18n() {
    const myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];

    const messages: Record<string, Record<string, string>> = {};

    const localeFilePaths = import.meta.glob<Record<string, string>>("@/assets/language/*.json", { import: "default" });
    for (const filePath in localeFilePaths) {
        const localeCode = path.parse(filePath).name;
        messages[localeCode] = await localeFilePaths[filePath]();
    }

    return createI18n({
        locale: myLocale,
        fallbackLocale: "en",
        messages,
        legacy: false,
    });
}
