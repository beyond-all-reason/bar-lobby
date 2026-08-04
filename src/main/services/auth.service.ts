// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { authenticate, renewAccessToken, TokenRequestError, TokenResponse } from "@main/oauth2/oauth2";
import { accountService } from "@main/services/account.service";
import { logger } from "@main/utils/logger";
import { ipcMain, type BarIpcWebContents } from "@main/typed-ipc";

const log = logger("auth-service");

export type AuthLossReason = "signed-out" | "expired" | "error";

export interface AuthState {
    authenticated: boolean;
    reason?: AuthLossReason;
}

const RENEW_AT_FRACTION_OF_LIFETIME = 0.5;
const TRANSIENT_RETRY_MS = 60 * 1000;

let renewalTimer: NodeJS.Timeout | undefined;
let renewalInFlight: Promise<void> | undefined;
let authenticated = false;
let emit: ((state: AuthState) => void) | undefined;

function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function kindOf(error: unknown): TokenRequestError["kind"] {
    return error instanceof TokenRequestError ? error.kind : "protocol";
}

function setAuthenticated(next: boolean, reason?: AuthLossReason) {
    if (authenticated === next) return;

    authenticated = next;
    emit?.({ authenticated, reason });
}

function stopRenewal() {
    if (!renewalTimer) return;

    clearTimeout(renewalTimer);
    renewalTimer = undefined;
}

function scheduleRenewal(delayMs: number) {
    stopRenewal();
    renewalTimer = setTimeout(() => void renew(), delayMs);
}

async function storeTokens({ token, refreshToken, expiresIn }: TokenResponse) {
    await accountService.saveTokens({
        token,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
    });

    scheduleRenewal(expiresIn * 1000 * RENEW_AT_FRACTION_OF_LIFETIME);
}

async function renew(): Promise<void> {
    if (renewalInFlight) return renewalInFlight;

    renewalInFlight = renewOnce().finally(() => {
        renewalInFlight = undefined;
    });

    return renewalInFlight;
}

async function renewOnce(): Promise<void> {
    const refreshToken = accountService.getRefreshToken();
    if (!refreshToken) {
        stopRenewal();
        setAuthenticated(false, "expired");
        return;
    }

    try {
        await storeTokens(await renewAccessToken(refreshToken));
        setAuthenticated(true);
        log.info("Renewed access token");
    } catch (error) {
        await onRenewalFailed(error);
    }
}

async function onRenewalFailed(error: unknown) {
    const kind = kindOf(error);
    log.error(`Token renewal failed (${kind}): ${describeError(error)}`);

    if (kind === "invalid_grant") {
        stopRenewal();
        await accountService.wipe();
        setAuthenticated(false, "expired");
        return;
    }

    // Renewal runs at half the token's lifetime, so there is usually still a
    // working access token. Keep the session and retry until it really expires.
    if (accountService.getExpiresAt() > Date.now()) {
        scheduleRenewal(TRANSIENT_RETRY_MS);
        return;
    }

    stopRenewal();
    setAuthenticated(false, "error");
}

async function acquireTokens(interactive: boolean): Promise<TokenResponse> {
    const refreshToken = accountService.getRefreshToken();
    if (!refreshToken) {
        if (!interactive) throw new TokenRequestError("invalid_grant", "No stored credentials");

        return authenticate();
    }

    try {
        return await renewAccessToken(refreshToken);
    } catch (error) {
        if (kindOf(error) !== "invalid_grant") throw error;

        await accountService.wipe();
        if (!interactive) throw error;

        // Without this, the first sign in after the server drops our refresh
        // token always fails and the user has to click again.
        log.info("Stored refresh token was rejected, falling back to interactive sign in");

        return authenticate();
    }
}

async function signIn(interactive: boolean) {
    try {
        await storeTokens(await acquireTokens(interactive));
        setAuthenticated(true);
        log.info("Signed in");
    } catch (error) {
        const kind = kindOf(error);
        log.error(`Sign in failed (${kind}): ${describeError(error)}`);

        stopRenewal();
        setAuthenticated(false, kind === "invalid_grant" ? "expired" : "error");

        throw error;
    }
}

async function signOut() {
    stopRenewal();
    await accountService.forgetToken();
    setAuthenticated(false, "signed-out");
}

async function forgetAccount() {
    stopRenewal();
    await accountService.wipe();
    setAuthenticated(false, "signed-out");
}

// Callers get a token that is good right now, or an empty string. Timers don't
// fire while the machine is asleep, so a scheduled renewal is not a guarantee.
async function getAccessToken(): Promise<string> {
    if (hasUsableToken()) return accountService.getToken();

    await renew();

    return hasUsableToken() ? accountService.getToken() : "";
}

function hasUsableToken(): boolean {
    return !!accountService.getToken() && accountService.getExpiresAt() > Date.now();
}

function state(): AuthState {
    return { authenticated };
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    emit = (next: AuthState) => webContents.send("auth:changed", next);

    ipcMain.handle("auth:login", (_event, interactive) => signIn(interactive ?? true));
    ipcMain.handle("auth:logout", () => signOut());
    ipcMain.handle("auth:wipe", () => forgetAccount());
    ipcMain.handle("auth:hasCredentials", () => !!accountService.getRefreshToken());
    ipcMain.handle("auth:state", () => state());
}

export const authService = {
    registerIpcHandlers,
    getAccessToken,
};
