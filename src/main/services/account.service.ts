// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { accountSchema } from "@main/json/model/account";
import { logger } from "@main/utils/logger";
import { safeStorage } from "electron";
import path from "path";

const log = logger("account-service");

const accountStore = new FileStore<typeof accountSchema>(path.join(CONFIG_PATH, "account.json"), accountSchema);

export interface StoredTokens {
    token: string;
    refreshToken: string;
    expiresAt: number;
}

async function init() {
    await accountStore.init();
}

// Whether the values on disk are encrypted is recorded alongside them, because
// safeStorage can stop being available between one run and the next.
function readStoredValue(value: string, label: string): string {
    if (!value) return "";

    const { encrypted } = accountStore.model;

    if (encrypted === false) return value;

    if (!safeStorage.isEncryptionAvailable()) {
        log.error(`Cannot read stored ${label}, encryption is not available`);
        return "";
    }

    try {
        return safeStorage.decryptString(Buffer.from(value, "base64"));
    } catch (e) {
        // A file written before the flag existed may hold a plain value, from a
        // run where encryption wasn't available.
        if (encrypted === undefined) return value;

        log.error(`Failed to decrypt stored ${label}`, e);
        return "";
    }
}

// The server drops the old refresh token as soon as a renewal succeeds, so the
// pair is written in a single update. Half-applied state locks the user out.
async function saveTokens({ token, refreshToken, expiresAt }: StoredTokens) {
    const encrypted = safeStorage.isEncryptionAvailable();
    if (!encrypted) {
        log.warn("Encryption is not available, storing tokens in plain text");
    }

    const encode = (value: string) => (encrypted ? safeStorage.encryptString(value).toString("base64") : value);

    await accountStore.update({
        token: encode(token),
        refreshToken: encode(refreshToken),
        expiresAt,
        encrypted,
    });
}

function getToken(): string {
    return readStoredValue(accountStore.model.token, "token");
}

function getRefreshToken(): string {
    return readStoredValue(accountStore.model.refreshToken, "refresh token");
}

function getExpiresAt(): number {
    return accountStore.model.expiresAt;
}

async function forgetToken() {
    await accountStore.update({
        token: "",
        expiresAt: 0,
    });
}

async function wipe() {
    await accountStore.update({
        token: "",
        refreshToken: "",
        expiresAt: 0,
    });
}

export type Account = typeof accountStore.model;
export const accountService = {
    init,
    saveTokens,
    getToken,
    getRefreshToken,
    getExpiresAt,
    wipe,
    forgetToken,
};
