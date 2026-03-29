// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MessagingReceivedEventData } from "tachyon-protocol/types";

export type Message = MessagingReceivedEventData & {
    seen: boolean;
};
