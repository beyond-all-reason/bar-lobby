// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Router } from "vue-router";

// The router's memory history doesn't expose the previous entry, so remember the page each
// navigation came from.
let previousPath: string | undefined;

export function rememberPreviousPage(router: Router) {
    router.afterEach((_to, from, failure) => {
        if (!failure) previousPath = from.path;
    });
}

// Goes to a page's fixed parent and takes the current page out of history, so going back from the
// parent can't return to it. Opened from the parent, history is [parent, page] and stepping back
// leaves [parent]. Opened from elsewhere, [elsewhere, page] becomes [elsewhere, parent]. A push
// would leave [elsewhere, page, parent], and going back from the parent would reopen the page.
export function goBackTo(router: Router, path: string) {
    if (previousPath === path) {
        router.back();
    } else {
        router.replace(path);
    }
}
