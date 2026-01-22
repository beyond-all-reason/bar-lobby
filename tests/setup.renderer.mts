// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { vi } from "vitest";
import { setupI18n } from "@renderer/i18n";
import { config } from "@vue/test-utils";

const mockTachyonApi = {
    onEvent: vi.fn(),
};

Object.defineProperty(window, "tachyon", {
    value: mockTachyonApi,
    writable: false,
});

const i18n = setupI18n();

config.global.plugins = [i18n];
