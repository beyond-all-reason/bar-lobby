// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { contentStatusScope, noContentStatusComparisons } from "./content-layer.mjs";
import { noDirectShellCalls, shellApiScope } from "./shell-api.mjs";

// eslint replaces no-restricted-syntax rather than merging it, so two blocks matching one file means
// the later one silently drops the other's selectors. Every selector is assembled in this one place so
// that cannot happen, and each block repeats the selectors of every block it overlaps.
export const restrictedSyntaxRules = [
    {
        ...contentStatusScope,
        rules: { "no-restricted-syntax": ["error", noContentStatusComparisons] },
    },
    {
        ...shellApiScope,
        rules: { "no-restricted-syntax": ["error", noDirectShellCalls, noContentStatusComparisons] },
    },
];
