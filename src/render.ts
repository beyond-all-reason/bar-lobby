import "primevue/resources/primevue.min.css";
import "flag-icons/css/flag-icons.min.css";
import "primeicons/primeicons.css";
import "@/assets/styles/styles.scss";

import { lastInArray } from "jaz-ts-utils";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import type { TransitionProps } from "vue";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";

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

    api.router.replace("/");

    window.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
            api.settings.model.fullscreen.value = !api.settings.model.fullscreen.value;
        }
    });

    window.addEventListener("beforeunload", async (event) => {
        console.debug("beforeunload", event);
        event.preventDefault();
        if (api.comms.isConnected.value) {
            //await api.comms.request("c.auth.disconnect", {});
            api.comms.disconnect();
        }
        return event;
    });
})();

async function setupI18n() {
    const myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
    const gameVersion = lastInArray(Array.from(api.content.game.installedVersions))!;
    const localeFiles = await api.content.game.getGameFiles(gameVersion, "language/" + myLocale + "/*.json");
    const messages: Record<string, Record<string, string>> = {};

    localeFiles.forEach((file) => {
        const i18nJson = JSON.parse(file.data.toString("utf8"));
        messages[myLocale] = { ...messages[myLocale], ...i18nJson };
    });

    return createI18n({
        locale: myLocale,
        fallbackLocale: "en",
        messages,
        legacy: false,
    });
}

async function setupVue() {
    const app = createApp(App);

    app.use(api.router);
    app.use(PrimeVue);

    const i18n = await setupI18n();
    app.use(i18n);

    app.directive("click-away", clickAwayDirective);
    app.directive("tooltip", Tooltip);

    app.mount("#app");

    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
    }
}
