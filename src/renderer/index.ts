// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import "primevue/resources/primevue.min.css";
import "flag-icons/css/flag-icons.min.css";
import "primeicons/primeicons.css";
import "@renderer/styles/styles.scss";

import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import App from "@renderer/App.vue";
import { clickAwayDirective } from "@renderer/utils/click-away-directive";
import { elementInViewDirective } from "@renderer/utils/element-in-view-directive";
import { audioApi } from "@renderer/audio/audio";
import { router } from "@renderer/router";
import { initPreMountStores } from "@renderer/store/stores";
import { setupI18n } from "@renderer/i18n";

setupVue();

async function setupVue() {
    const app = createApp(App);

    // Init stores before mounting app
    // Settings store is needed before i18n to provide selected locale
    await initPreMountStores();
    await audioApi.init();

    // Plugins
    app.use(router);
    app.use(PrimeVue, { ripple: true });
    app.use(setupI18n());

    // Directives
    app.directive("click-away", clickAwayDirective);
    app.directive("in-view", elementInViewDirective);
    app.directive("tooltip", Tooltip);

    app.mount("#app");
}
