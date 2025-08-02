// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { vi } from "vitest";

const mockIpcRenderer = {
    on: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn().mockResolvedValue(undefined),
};

vi.mock("electron", () => ({
    ipcRenderer: mockIpcRenderer,
    isPackaged: false,
}));

vi.mock("@main/utils/logger", () => ({
    logger: () => {
        return {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };
    },
}));
