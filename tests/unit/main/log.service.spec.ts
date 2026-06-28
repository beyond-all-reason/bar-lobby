// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import os from "os";
import path from "path";
import { mkdtemp, readdir, rm, writeFile } from "fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Log service", () => {
    let logsPath: string;
    let activeLogPath: string;
    let packSpecificFiles: ReturnType<typeof vi.fn>;
    let axios: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        logsPath = await mkdtemp(path.join(os.tmpdir(), "bar-lobby-logs-"));
        activeLogPath = path.join(logsPath, "lobby-20260628T120000.log");
        packSpecificFiles = vi.fn(async (archivePath: string) => {
            await writeFile(archivePath, "archive");
        });
        axios = vi.fn().mockResolvedValue({ status: 200 });

        vi.doMock("@main/config/app", () => ({ LOGS_PATH: logsPath }));
        vi.doMock("@main/utils/logger", () => ({
            ACTIVE_LOG_FILE_PATH: activeLogPath,
            logger: () => ({ debug: vi.fn(), info: vi.fn(), error: vi.fn(), fatal: vi.fn() }),
        }));
        vi.doMock("@main/utils/pack-7z", () => ({ packSpecificFiles }));
        vi.doMock("axios", () => ({ default: axios }));
        vi.doMock("@main/services/settings.service", () => ({
            settingsService: { getSettings: () => ({ logUploadUrl: "https://logs.example/" }) },
        }));
        vi.doMock("@main/typed-ipc", () => ({ ipcMain: { handle: vi.fn() } }));
    });

    afterEach(async () => {
        vi.doUnmock("@main/config/app");
        vi.doUnmock("@main/utils/logger");
        vi.doUnmock("@main/utils/pack-7z");
        vi.doUnmock("axios");
        vi.doUnmock("@main/services/settings.service");
        vi.doUnmock("@main/typed-ipc");
        await rm(logsPath, { recursive: true, force: true });
    });

    async function loadService() {
        return import("@main/services/log.service");
    }

    async function createLog(fileName: string, content = "log") {
        const filePath = path.join(logsPath, fileName);
        await writeFile(filePath, content);
        return filePath;
    }

    it("retains only canonical logs and removes stale upload artifacts", async () => {
        await createLog(path.basename(activeLogPath));
        for (let index = 0; index < 15; index++) {
            await createLog(`lobby-20260627T${String(index).padStart(6, "0")}.log`);
        }
        await createLog("lobby-invalid.log");
        await createLog("lobby-20260628T120000most_recent.log");
        await createLog(".upload-stale-most_recent.log");
        await createLog("logs-stale.zip");

        const { purgeLogFiles } = await loadService();
        const filesForUpload = await purgeLogFiles();
        const remainingFiles = await readdir(logsPath);
        const remainingCanonicalLogs = remainingFiles.filter((file) => /^lobby-\d{8}T\d{6}\.log$/.test(file));

        expect(remainingCanonicalLogs).toHaveLength(14);
        expect(remainingFiles).toContain(path.basename(activeLogPath));
        expect(remainingFiles).toContain("lobby-invalid.log");
        expect(remainingFiles).not.toContain("lobby-20260628T120000most_recent.log");
        expect(remainingFiles).not.toContain(".upload-stale-most_recent.log");
        expect(remainingFiles).not.toContain("logs-stale.zip");
        expect(filesForUpload).toHaveLength(7);
        expect(filesForUpload[0]).toBe(activeLogPath);
    });

    it("packs a temporary copy of the active log and removes the copy afterwards", async () => {
        await createLog(path.basename(activeLogPath));
        await createLog("lobby-20260627T120000.log");
        const { packLogFiles } = await loadService();

        const archivePath = await packLogFiles();
        const packedFiles = packSpecificFiles.mock.calls[0][1] as string[];
        const remainingFiles = await readdir(logsPath);

        expect(packedFiles[0]).toMatch(/\.upload-[a-f0-9]+-most_recent\.log$/);
        expect(packedFiles).toContain(path.join(logsPath, "lobby-20260627T120000.log"));
        expect(remainingFiles.some((file) => file.startsWith(".upload-"))).toBe(false);
        expect(remainingFiles).toContain(path.basename(archivePath));
    });

    it("removes temporary files and a partial archive when packing fails", async () => {
        await createLog(path.basename(activeLogPath));
        packSpecificFiles.mockImplementationOnce(async (archivePath: string) => {
            await writeFile(archivePath, "partial archive");
            throw new Error("7-Zip failed");
        });
        const { packLogFiles } = await loadService();

        await expect(packLogFiles()).rejects.toThrow("7-Zip failed");

        const remainingFiles = await readdir(logsPath);
        expect(remainingFiles.some((file) => file.startsWith(".upload-"))).toBe(false);
        expect(remainingFiles.some((file) => file.endsWith(".zip"))).toBe(false);
    });

    it("removes the archive when upload fails and allows a later retry", async () => {
        await createLog(path.basename(activeLogPath));
        axios.mockRejectedValueOnce(new Error("Network failed")).mockResolvedValueOnce({ status: 200 });
        const { uploadLogFiles } = await loadService();

        await expect(uploadLogFiles()).rejects.toThrow("Network failed");
        expect((await readdir(logsPath)).some((file) => file.endsWith(".zip"))).toBe(false);

        await expect(uploadLogFiles()).resolves.toMatch(/^https:\/\/logs\.example\/logs-/);
        expect((await readdir(logsPath)).some((file) => file.endsWith(".zip"))).toBe(false);
    });

    it("rejects a concurrent upload", async () => {
        await createLog(path.basename(activeLogPath));
        let finishUpload!: () => void;
        axios.mockReturnValueOnce(
            new Promise<void>((resolve) => {
                finishUpload = resolve;
            })
        );
        const { uploadLogFiles } = await loadService();

        const firstUpload = uploadLogFiles();
        await vi.waitFor(() => expect(axios).toHaveBeenCalledTimes(1));

        await expect(uploadLogFiles()).rejects.toThrow("Log upload is already in progress.");

        finishUpload();
        await expect(firstUpload).resolves.toMatch(/^https:\/\/logs\.example\/logs-/);
    });
});
