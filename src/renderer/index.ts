import "primevue/resources/primevue.min.css";
import "flag-icons/css/flag-icons.min.css";
import "primeicons/primeicons.css";
import "@renderer/styles/styles.scss";

import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import type { TransitionProps } from "vue";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import { localeFilePaths } from "@renderer/assets/assetFiles";

import App from "@renderer/App.vue";
import { clickAwayDirective } from "@renderer/utils/click-away-directive";
import { elementInViewDirective } from "@renderer/utils/element-in-view-directive";
import { audioApi } from "@renderer/audio/audio";
import { router } from "@renderer/router";
import { settingsStore } from "@renderer/store/settings.store";
import { initPreMountStores } from "@renderer/store/stores";

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
        redirect?: string;
    }
}

(async () => {
    await setupVue();
    window.addEventListener("keydown", (event) => {
        if (event.code === "F11") {
            event.preventDefault();
            settingsStore.fullscreen = !settingsStore.fullscreen;
        }
    });
})();

async function setupVue() {
    const app = createApp(App);
    app.use(router);
    app.use(PrimeVue, {
        ripple: true,
    });
    app.use(await setupI18n());
    app.directive("click-away", clickAwayDirective);
    app.directive("in-view", elementInViewDirective);
    app.directive("tooltip", Tooltip);
    if (process.env.NODE_ENV !== "production") {
        app.config.globalProperties.window = window;
    }
    // Init stores before mounting app
    await initPreMountStores();
    await audioApi.init();
    app.mount("#app");
}

async function setupI18n() {
    const myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
    const messages: Record<string, Record<string, string>> = {};
    for (const filePath in localeFilePaths) {
        const localeCode = filePath.match(/([a-z]{2})\.json$/)![1];
        messages[localeCode] = localeFilePaths[filePath];
    }
    return createI18n({
        locale: myLocale,
        fallbackLocale: "en",
        messages,
        legacy: false,
    });
}
