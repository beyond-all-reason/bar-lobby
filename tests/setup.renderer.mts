// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { vi } from "vitest";
import { i18n } from "@renderer/i18n";
import { config } from "@vue/test-utils";

const mockTachyonApi = {
    onEvent: vi.fn(),
};

Object.defineProperty(window, "tachyon", {
    value: mockTachyonApi,
    writable: false,
});

config.global.plugins = [i18n];
