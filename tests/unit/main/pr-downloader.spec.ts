// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";

const { mockSpawn } = vi.hoisted(() => ({ mockSpawn: vi.fn() }));

vi.mock("child_process", () => ({ spawn: mockSpawn }));
vi.mock("@main/config/app", () => ({
    getAssetsPath: () => "/assets",
    getCaCertPath: () => undefined,
    getEnginePath: () => "/assets/engine",
}));
vi.mock("@main/content/engine/engine-content", () => ({
    engineContentAPI: {
        getDefaultEngine: () => ({ id: "engine-version", installed: true }),
    },
}));

import { PrDownloaderAPI } from "@main/content/pr-downloader";

class TestPrDownloaderAPI extends PrDownloaderAPI<string, string> {
    public isVersionInstalled(): boolean {
        return false;
    }

    public async uninstallVersion(): Promise<void> {}
}

function createMockProcess() {
    const process = new EventEmitter();
    Object.assign(process, { stdout: new EventEmitter(), stderr: new EventEmitter() });
    return process;
}

describe("PrDownloaderAPI.validateSdp", () => {
    it("returns true when pr-downloader validates the SDP successfully", async () => {
        const process = createMockProcess();
        mockSpawn.mockReturnValueOnce(process);
        const api = new TestPrDownloaderAPI();

        const validation = api.validateSdp("/assets/packages/game.sdp");
        process.emit("exit", 0, null);

        await expect(validation).resolves.toBe(true);
        expect(mockSpawn).toHaveBeenCalledWith("/assets/engine/engine-version/pr-downloader", ["--filesystem-writepath", "/assets", "--validate-sdp", "/assets/packages/game.sdp"], expect.any(Object));
    });

    it("returns false when pr-downloader reports a missing or invalid pool object", async () => {
        const process = createMockProcess();
        mockSpawn.mockReturnValueOnce(process);
        const api = new TestPrDownloaderAPI();

        const validation = api.validateSdp("/assets/packages/game.sdp");
        process.emit("exit", 1, null);

        await expect(validation).resolves.toBe(false);
    });
});
