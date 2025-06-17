// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export const pluralize = (str: string, quantity: number, locale: string = "en-US"): string => {
    const rule = new Intl.PluralRules(locale).select(quantity);
    if (rule == "one") return str;
    return str + "s"; // TODO: link to i18n translation files
};

export const processTranslationData = (jsonData) => {
    for (const key in jsonData) {
        if (typeof jsonData[key] === "object") {
            jsonData[key] = processTranslationData(jsonData[key]);
        } else if (typeof jsonData[key] === "string") jsonData[key] = jsonData[key].replaceAll(/%\{(.*?)\}/g, "{$1}");
    }
    return jsonData;
};
