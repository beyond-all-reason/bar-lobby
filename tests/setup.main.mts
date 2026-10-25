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
    app: { isPackaged: false, getAppPath: () => process.cwd() },
}));

// Tests run as the standalone client whatever BAR_EDITION the shell has set. A test about another edition
// mocks this module itself.
vi.mock("@main/config/edition", async () => {
    const { editionFeatures } = await vi.importActual<typeof import("@shared/edition")>("@shared/edition");

    return { EDITION: "standalone", EDITION_FEATURES: editionFeatures("standalone") };
});

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
