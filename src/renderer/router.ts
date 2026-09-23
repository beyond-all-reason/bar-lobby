// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { createMemoryHistory, createRouter } from "vue-router";
import { routes, handleHotUpdate } from "vue-router/auto-routes";
import { useLogInConfirmation } from "@renderer/composables/useLogInConfirmation";
import type { RouteLocationNormalized } from "vue-router";
import { me } from "@renderer/store/me.store";

export const router = createRouter({
    // Kept out of the page history, which Chromium lets the mouse back and forward buttons walk.
    history: createMemoryHistory(),
    routes,
});

if (import.meta.hot) {
    handleHotUpdate(router);
}

const { openLogInConfirmation } = useLogInConfirmation();
router.beforeEach((to: RouteLocationNormalized) => {
    if (to.meta?.onlineOnly && !me.isAuthenticated) {
        openLogInConfirmation(to);
        return false;
    }
});
