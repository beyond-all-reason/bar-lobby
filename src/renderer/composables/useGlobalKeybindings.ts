// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Ref } from "vue";
import { useRouter } from "vue-router";
import { onKeyDown } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";

type KeybindingProps = { exitOpen: Ref<boolean, boolean> };

export function useGlobalKeybindings({ exitOpen }: KeybindingProps) {
    const router = useRouter();

    onKeyDown("F11", (e) => {
        e.preventDefault();
        settingsStore.fullscreen = !settingsStore.fullscreen;
    });

    onKeyDown("Escape", (e) => {
        if (e.defaultPrevented) return; // Some components might handle this already
        e.preventDefault();
        if (router.currentRoute.value.path.startsWith("/login") || router.currentRoute.value.path.startsWith("/play")) {
            exitOpen.value = !exitOpen.value;
        } else {
            const routeSegments = router.currentRoute.value.path.split("/");
            // "/primary/secondary" => ["", "primary", "secondary", ...]
            if (routeSegments.length <= 3) {
                router.push("/play");
            } else {
                router.back();
            }
        }
    });
}
