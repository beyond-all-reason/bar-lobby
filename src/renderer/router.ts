// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { createRouter, createWebHashHistory } from "vue-router";
import { routes, handleHotUpdate } from "vue-router/auto-routes";

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

if (import.meta.hot) {
    handleHotUpdate(router);
}
