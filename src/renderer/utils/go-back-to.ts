// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Router } from "vue-router";

// Goes to a page's fixed parent and takes the current page out of history, so going back from the
// parent can't return to it. history.state.back is the path of the previous history entry.
//
// For example, leaving a map's details page for the maps list:
// - opened from the maps list, history is [maps list, map]. The previous entry already is the
//   maps list, so step back to it: [maps list].
// - opened from matchmaking, history is [matchmaking, map]. Replace the map with the maps list:
//   [matchmaking, maps list], and going back from the maps list returns to matchmaking.
//
// router.push would give [matchmaking, map, maps list] instead, and going back from the maps list
// would reopen the map.
export function goBackTo(router: Router, path: string) {
    if (window.history.state?.back === path) {
        router.back();
    } else {
        router.replace(path);
    }
}
