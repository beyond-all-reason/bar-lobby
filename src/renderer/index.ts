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

new ResizeObserver(() => {
    window.mainWindow.resized();
}).observe(document.body);

async function setupVue() {
    const app = createApp(App);

    // Plugins
    app.use(router);
    app.use(PrimeVue, { ripple: true });
    app.use(setupI18n());

    // Directives
    app.directive("click-away", clickAwayDirective);
    app.directive("in-view", elementInViewDirective);
    app.directive("tooltip", Tooltip);

    try {
        // Init stores before mounting app
        await initPreMountStores();
        await audioApi.init();
    } catch (err) {
        console.error("Failed to initialize stores:", err);
        const root = document.getElementById("app");
        if (root) {
            root.innerHTML = `<div style="color:white;padding:32px;font-family:sans-serif"><b>Failed to start</b><br><pre style="margin-top:12px;font-size:12px;opacity:0.7">${err}</pre></div>`;
        }
        return;
    }

    app.mount("#app");
}
