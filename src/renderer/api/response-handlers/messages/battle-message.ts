// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Type } from "@sinclair/typebox";

import { createMessageHandlers } from "@renderer/model/messages";

export const battleMessageHandlers = createMessageHandlers(
    {
        regex: new RegExp(/!vote/),
        schema: Type.Object({}),
        async handler(data, message) {
            message.hide = true;
        },
    },
    {
        regex: new RegExp(/!joinas/),
        schema: Type.Object({}),
        async handler(data, message) {
            message.hide = true;
        },
    }
);
