// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { PartyState } from "tachyon-protocol/types";

export type Party = PartyState & {
    // Allows us to easily filter down changes to invite/party state or alert in the UI
    seen: boolean;
};
