// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { TokenRequestError } = vi.hoisted(() => {
    class TokenRequestError extends Error {
        readonly kind: string;

        constructor(kind: string, message: string) {
            super(message);
            this.kind = kind;
        }
    }

    return { TokenRequestError };
});

const oauth2 = vi.hoisted(() => ({
    authenticate: vi.fn(),
    renewAccessToken: vi.fn(),
}));

const account = vi.hoisted(() => {
    const state = { token: "", refreshToken: "", expiresAt: 0 };

    return {
        state,
        service: {
            saveTokens: vi.fn(async ({ token, refreshToken, expiresAt }: any) => {
                state.token = token;
                state.refreshToken = refreshToken;
                state.expiresAt = expiresAt;
            }),
            getToken: () => state.token,
            getRefreshToken: () => state.refreshToken,
            getExpiresAt: () => state.expiresAt,
            wipe: vi.fn(async () => {
                state.token = "";
                state.refreshToken = "";
                state.expiresAt = 0;
            }),
        },
    };
});

const ipc = vi.hoisted(() => ({ handlers: new Map<string, any>() }));

vi.mock("@main/oauth2/oauth2", () => ({ ...oauth2, TokenRequestError }));
vi.mock("@main/services/account.service", () => ({ accountService: account.service }));
vi.mock("@main/utils/logger", () => ({
    logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock("@main/typed-ipc", () => ({
    ipcMain: { handle: (channel: string, handler: any) => ipc.handlers.set(channel, handler) },
}));

const LIFETIME_SECONDS = 1800;
const RENEWAL_DUE_MS = (LIFETIME_SECONDS * 1000) / 2 + 10;
const TRANSIENT_RETRY_MS = 60 * 1000;

const freshTokens = (suffix: string) => ({
    token: `access-${suffix}`,
    refreshToken: `refresh-${suffix}`,
    expiresIn: LIFETIME_SECONDS,
});

async function loadService() {
    vi.resetModules();
    ipc.handlers.clear();

    const webContents = { send: vi.fn() };
    const { authService } = await import("@main/services/auth.service");
    authService.registerIpcHandlers(webContents as any);

    return { authService, webContents };
}

const signIn = (interactive = true) => ipc.handlers.get("auth:login")!(null, interactive);

describe("auth session policy", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        oauth2.authenticate.mockReset();
        oauth2.renewAccessToken.mockReset();
        account.state.token = "";
        account.state.refreshToken = "";
        account.state.expiresAt = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("persists the rotated refresh token", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValue(freshTokens("1"));

        await loadService();
        await signIn();

        expect(account.service.saveTokens).toHaveBeenCalledWith(expect.objectContaining({ token: "access-1", refreshToken: "refresh-1" }));
        expect(account.state.refreshToken).toBe("refresh-1");
    });

    it("keeps credentials when a renewal fails for a transient reason", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValueOnce(freshTokens("1")).mockRejectedValueOnce(new TokenRequestError("server", "bad gateway"));

        const { webContents } = await loadService();
        await signIn();
        await vi.advanceTimersByTimeAsync(RENEWAL_DUE_MS);

        expect(account.service.wipe).not.toHaveBeenCalled();
        expect(account.state.refreshToken).toBe("refresh-1");
        expect(webContents.send).not.toHaveBeenCalledWith("auth:changed", expect.objectContaining({ authenticated: false }));
    });

    it("retries a transient failure without a further sign in", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValueOnce(freshTokens("1")).mockRejectedValueOnce(new TokenRequestError("network", "offline")).mockResolvedValueOnce(freshTokens("2"));

        await loadService();
        await signIn();
        await vi.advanceTimersByTimeAsync(RENEWAL_DUE_MS);
        await vi.advanceTimersByTimeAsync(60 * 1000 + 10);

        expect(account.state.refreshToken).toBe("refresh-2");
    });

    it("wipes and reports expiry when the server rejects the refresh token", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValueOnce(freshTokens("1")).mockRejectedValueOnce(new TokenRequestError("invalid_grant", "revoked"));

        const { webContents } = await loadService();
        await signIn();
        await vi.advanceTimersByTimeAsync(RENEWAL_DUE_MS);

        expect(account.service.wipe).toHaveBeenCalled();
        expect(webContents.send).toHaveBeenCalledWith("auth:changed", { authenticated: false, reason: "expired" });
    });

    it("falls back to interactive sign in when the stored refresh token is rejected", async () => {
        account.state.refreshToken = "stale";
        oauth2.renewAccessToken.mockRejectedValue(new TokenRequestError("invalid_grant", "revoked"));
        oauth2.authenticate.mockResolvedValue(freshTokens("1"));

        await loadService();
        await signIn();

        expect(oauth2.authenticate).toHaveBeenCalled();
        expect(account.state.refreshToken).toBe("refresh-1");
    });

    it("does not open a browser for a non-interactive sign in", async () => {
        account.state.refreshToken = "stale";
        oauth2.renewAccessToken.mockRejectedValue(new TokenRequestError("invalid_grant", "revoked"));

        await loadService();

        await expect(signIn(false)).rejects.toThrow();
        expect(oauth2.authenticate).not.toHaveBeenCalled();
    });

    it("gives up once a transient failure outlasts the access token", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValueOnce(freshTokens("1")).mockRejectedValue(new TokenRequestError("server", "still down"));

        const { webContents } = await loadService();
        await signIn();

        // Past the lifetime plus a retry interval, so a retry is guaranteed to
        // fire after expiry whatever the renewal fraction is set to.
        await vi.advanceTimersByTimeAsync(LIFETIME_SECONDS * 1000 + TRANSIENT_RETRY_MS);

        expect(webContents.send).toHaveBeenCalledWith("auth:changed", { authenticated: false, reason: "error" });
        expect(account.service.wipe).not.toHaveBeenCalled();
    });

    it("announces each transition once", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValue(freshTokens("1"));

        const { webContents } = await loadService();
        await signIn();
        await vi.advanceTimersByTimeAsync(RENEWAL_DUE_MS);

        const announcements = webContents.send.mock.calls.filter(([channel]) => channel === "auth:changed");
        expect(announcements).toEqual([["auth:changed", { authenticated: true, reason: undefined }]]);
    });

    it("hands out the stored token while it is still good", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValue(freshTokens("1"));

        const { authService } = await loadService();
        await signIn();

        await expect(authService.getAccessToken()).resolves.toBe("access-1");
        expect(oauth2.renewAccessToken).toHaveBeenCalledTimes(1);
    });

    it("renews on demand when the stored token has expired", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValueOnce(freshTokens("1")).mockResolvedValueOnce(freshTokens("2"));

        const { authService } = await loadService();
        await signIn();
        account.state.expiresAt = Date.now() - 1;

        await expect(authService.getAccessToken()).resolves.toBe("access-2");
    });

    it("hands out nothing when an on demand renewal fails", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValueOnce(freshTokens("1")).mockRejectedValueOnce(new TokenRequestError("server", "down"));

        const { authService } = await loadService();
        await signIn();
        account.state.expiresAt = Date.now() - 1;

        await expect(authService.getAccessToken()).resolves.toBe("");
    });

    // Leaving the refresh token behind is what made a separate "change account"
    // action necessary, so signing out has to take both.
    it("drops both tokens on sign out", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValue(freshTokens("1"));

        const { webContents } = await loadService();
        await signIn();
        await ipc.handlers.get("auth:logout")!();

        expect(account.state.token).toBe("");
        expect(account.state.refreshToken).toBe("");
        expect(webContents.send).toHaveBeenCalledWith("auth:changed", { authenticated: false, reason: "signed-out" });
    });

    it("leaves nothing to sign back in with", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValue(freshTokens("1"));

        await loadService();
        await signIn();
        await ipc.handlers.get("auth:logout")!();

        expect(ipc.handlers.get("auth:hasCredentials")!()).toBe(false);
    });

    it("stops renewing after sign out", async () => {
        account.state.refreshToken = "refresh-0";
        oauth2.renewAccessToken.mockResolvedValue(freshTokens("1"));

        await loadService();
        await signIn();
        await ipc.handlers.get("auth:logout")!();

        oauth2.renewAccessToken.mockClear();
        await vi.advanceTimersByTimeAsync(LIFETIME_SECONDS * 1000);

        expect(oauth2.renewAccessToken).not.toHaveBeenCalled();
    });
});
