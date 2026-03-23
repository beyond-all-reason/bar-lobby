// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MessagingReceivedEventData } from "tachyon-protocol/types";

export type Message = MessagingReceivedEventData & {
    seen: boolean;
    isMe: boolean; // Required so we can distinguish messages we add from ourselves to the array.
};
