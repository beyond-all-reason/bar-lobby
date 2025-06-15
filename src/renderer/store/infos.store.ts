// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Info } from "@main/services/info.service";
import { reactive } from "vue";

export const infosStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Info);

export async function initInfosStore() {
    const currentInfos = await window.info.getInfo();
    Object.assign(infosStore, currentInfos);
    infosStore.isInitialized = true;
}
