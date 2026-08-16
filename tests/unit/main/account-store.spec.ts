// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const store = vi.hoisted(() => ({ dir: "" }));

const electronMock = vi.hoisted(() => {
    const state = { available: true };

    return {
        state,
        safeStorage: {
            isEncryptionAvailable: () => state.available,
            encryptString: (value: string) => Buffer.from(`enc:${value}`),
            decryptString: (buffer: Buffer) => {
                const raw = buffer.toString();
                if (!raw.startsWith("enc:")) throw new Error("cannot decrypt");

                return raw.slice(4);
            },
        },
    };
});

vi.mock("electron", () => ({ safeStorage: electronMock.safeStorage }));
vi.mock("@main/config/app", () => ({ CONFIG_PATH: store.dir }));

const accountFile = () => path.join(store.dir, "account.json");
const onDisk = () => JSON.parse(fs.readFileSync(accountFile(), "utf-8"));

const tokens = { token: "access-1", refreshToken: "refresh-1", expiresAt: 1_800_000 };

async function loadService() {
    vi.resetModules();
    const { accountService } = await import("@main/services/account.service");
    await accountService.init();

    return accountService;
}

beforeAll(() => {
    store.dir = fs.mkdtempSync(path.join(os.tmpdir(), "bar-account-"));
});

afterAll(() => {
    fs.rmSync(store.dir, { recursive: true, force: true });
});

beforeEach(() => {
    fs.rmSync(accountFile(), { force: true });
    electronMock.state.available = true;
});

describe("account store", () => {
    it("round trips tokens without leaving them readable on disk", async () => {
        const accountService = await loadService();
        await accountService.saveTokens(tokens);

        const raw = fs.readFileSync(accountFile(), "utf-8");
        expect(raw).not.toContain("access-1");
        expect(raw).not.toContain("refresh-1");

        expect(accountService.getToken()).toBe("access-1");
        expect(accountService.getRefreshToken()).toBe("refresh-1");
        expect(accountService.getExpiresAt()).toBe(1_800_000);
    });

    it("writes the pair and its expiry together", async () => {
        const accountService = await loadService();
        await accountService.saveTokens(tokens);

        const saved = onDisk();
        expect(saved.token).toBeTruthy();
        expect(saved.refreshToken).toBeTruthy();
        expect(saved.expiresAt).toBe(1_800_000);
        expect(saved.encrypted).toBe(true);
    });

    it("survives a restart", async () => {
        const first = await loadService();
        await first.saveTokens(tokens);

        const second = await loadService();
        expect(second.getToken()).toBe("access-1");
        expect(second.getRefreshToken()).toBe("refresh-1");
    });

    it("falls back to plain text when encryption is unavailable", async () => {
        electronMock.state.available = false;

        const accountService = await loadService();
        await accountService.saveTokens(tokens);

        expect(onDisk().encrypted).toBe(false);
        expect(accountService.getToken()).toBe("access-1");
    });

    it("returns nothing when the values were encrypted but encryption has gone away", async () => {
        const accountService = await loadService();
        await accountService.saveTokens(tokens);

        electronMock.state.available = false;

        expect(accountService.getToken()).toBe("");
        expect(accountService.getRefreshToken()).toBe("");
    });

    it("returns nothing for a value it cannot decrypt", async () => {
        const accountService = await loadService();
        await accountService.saveTokens(tokens);
        fs.writeFileSync(accountFile(), JSON.stringify({ ...onDisk(), token: Buffer.from("garbage").toString("base64") }));

        const reopened = await loadService();
        expect(reopened.getToken()).toBe("");
        expect(reopened.getRefreshToken()).toBe("refresh-1");
    });

    // Files written before the encrypted flag existed have to keep working, or
    // everyone gets signed out by the upgrade.
    it("decrypts a file from before the flag existed", async () => {
        fs.writeFileSync(
            accountFile(),
            JSON.stringify({
                token: Buffer.from("enc:access-1").toString("base64"),
                refreshToken: Buffer.from("enc:refresh-1").toString("base64"),
            })
        );

        const accountService = await loadService();

        expect(accountService.getToken()).toBe("access-1");
        expect(accountService.getRefreshToken()).toBe("refresh-1");
    });

    it("reads a plain value from before the flag existed", async () => {
        fs.writeFileSync(accountFile(), JSON.stringify({ token: "access-1", refreshToken: "refresh-1" }));

        const accountService = await loadService();

        expect(accountService.getToken()).toBe("access-1");
        expect(accountService.getRefreshToken()).toBe("refresh-1");
    });

    it("returns nothing for a file from before the flag when encryption is unavailable", async () => {
        fs.writeFileSync(accountFile(), JSON.stringify({ token: Buffer.from("enc:access-1").toString("base64") }));
        electronMock.state.available = false;

        const accountService = await loadService();

        expect(accountService.getToken()).toBe("");
    });

    // The name has to be readable before anything has connected, so it is not
    // encrypted and it lives beside the credentials rather than in the renderer.
    it("remembers who the credentials belong to across a restart", async () => {
        const first = await loadService();
        await first.saveIdentity({ userId: "42", username: "Hectwo", displayName: "Hectwo", countryCode: "GB" });

        const second = await loadService();
        expect(second.getIdentity()).toEqual({ userId: "42", username: "Hectwo", displayName: "Hectwo", countryCode: "GB" });
    });

    // Renewals write the token pair every few minutes, long after the identity
    // was recorded, so they must not carry it away with them.
    it("keeps the identity through a token renewal", async () => {
        const accountService = await loadService();
        await accountService.saveIdentity({ userId: "42", username: "Hectwo", displayName: "Hectwo", countryCode: "GB" });
        await accountService.saveTokens(tokens);

        expect(accountService.getIdentity()).toBeDefined();
        expect(onDisk().identity).toBeDefined();
    });

    it("forgets the identity along with the credentials", async () => {
        const accountService = await loadService();
        await accountService.saveTokens(tokens);
        await accountService.saveIdentity({ userId: "42", username: "Hectwo", displayName: "Hectwo", countryCode: "GB" });
        await accountService.wipe();

        expect(accountService.getIdentity()).toBeUndefined();
    });

    it("clears everything on a wipe", async () => {
        const accountService = await loadService();
        await accountService.saveTokens(tokens);
        await accountService.wipe();

        expect(accountService.getToken()).toBe("");
        expect(accountService.getRefreshToken()).toBe("");
        expect(accountService.getExpiresAt()).toBe(0);
    });
});
