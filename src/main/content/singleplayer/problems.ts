// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { ContentProblem } from "../../../shared/content/singleplayer";

/**
 * Collects problems for one item, adding them to the list shared by the whole scan as they arrive. An item
 * with any error is left out of the results, while its problems stay listed and the other items load.
 */
export class Problems {
    private errors = 0;

    constructor(
        private readonly all: ContentProblem[] = [],
        private readonly parent?: Problems
    ) {}

    get list(): readonly ContentProblem[] {
        return this.all;
    }

    get hasErrors() {
        return this.errors > 0;
    }

    error(path: string, message: string) {
        this.countError();
        this.all.push({ path, severity: "error", message });
    }

    private countError() {
        this.errors++;
        this.parent?.countError();
    }

    warning(path: string, message: string) {
        this.all.push({ path, severity: "warning", message });
    }

    // Its own error count for a part of this item, such as one mission of a campaign, whose errors count
    // against this item too.
    child() {
        return new Problems(this.all, this);
    }
}
