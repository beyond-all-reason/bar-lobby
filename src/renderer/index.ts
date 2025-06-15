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
import { createI18n } from "vue-i18n";
import { localeFilePaths } from "@renderer/assets/assetFiles";

import App from "@renderer/App.vue";
import { clickAwayDirective } from "@renderer/utils/click-away-directive";
import { elementInViewDirective } from "@renderer/utils/element-in-view-directive";
import { audioApi } from "@renderer/audio/audio";
import { router } from "@renderer/router";
import { initPreMountStores } from "@renderer/store/stores";
import { processTranslationData } from "@renderer/utils/i18n";

setupVue();

async function setupVue() {
    const app = createApp(App);

    // Plugins
    app.use(router);
    app.use(PrimeVue, { ripple: true });
    app.use(await setupI18n());

    // Directives
    app.directive("click-away", clickAwayDirective);
    app.directive("in-view", elementInViewDirective);
    app.directive("tooltip", Tooltip);

    // Init stores before mounting app
    await initPreMountStores();
    await audioApi.init();

    app.mount("#app");
}

async function setupI18n() {
    const myLocale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
    // `any` required as these are loaded from json files with no defined format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: Record<string, any> = {};
    const translationFiles: Record<string, Array<string>> = {};

    for (const filePath in localeFilePaths) {
        const localeCode = filePath.match(/\/([a-z]{2})\/.+?\.json$/)![1];
        const translationFileURI = `${localeFilePaths[filePath]}`;
        if (Array.isArray(translationFiles[localeCode])) translationFiles[localeCode].push(translationFileURI);
        else translationFiles[localeCode] = [translationFileURI];
    }

    for (const locale in translationFiles) {
        // prevent unnecesary processing of translation files and load only client locale and fallback
        if (locale != myLocale || locale != 'en') continue;
        for (const translationFile of translationFiles[locale]) {
            try {
                fetch(translationFile)
                    .then((res) => res.json())
                    .then((jsonData) => processTranslationData(jsonData))
                    .then((processedData) => messages[locale] = processedData)
            } catch (err) {
                console.error(`Error loading translation file ${translationFile} for locale ${locale}: `, err);
            }
        }
    }

    return createI18n({
        locale: myLocale,
        fallbackLocale: "en",
        messages,
        legacy: false,
    });
}
