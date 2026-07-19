// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { DiagonalChoice } from "@renderer/components/battle/diagonal-choice.types";

export type ChoiceActionResult = { ok: true } | { ok: false; message: string };

type ChoicePanelAppearance = Omit<DiagonalChoice, "disabled">;

export type ChoicePanelBranch = ChoicePanelAppearance & {
    type: "branch";
    children: ChoicePanelItem[];
    beforeEnter?: () => void | Promise<void>;
};

export type ChoicePanelAction = ChoicePanelAppearance & {
    type: "action";
    run: () => ChoiceActionResult | Promise<ChoiceActionResult>;
};

export type ChoicePanelItem = ChoicePanelBranch | ChoicePanelAction;
