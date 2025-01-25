import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { accountSchema } from "@main/json/model/account";
import { logger } from "@main/utils/logger";
import { safeStorage } from "electron";
import path from "path";

const log = logger("account-service");

const accountStore = new FileStore<typeof accountSchema>(path.join(CONFIG_PATH, "account.json"), accountSchema);

async function init() {
    await accountStore.init();
}

async function saveToken(token: string) {
    if (safeStorage.isEncryptionAvailable()) {
        token = safeStorage.encryptString(token).toString("base64");
    } else {
        log.warn("Encryption is not available, storing token in plain text");
    }
    await accountStore.update({ token });
}

async function saveRefreshToken(refreshToken: string) {
    if (safeStorage.isEncryptionAvailable()) {
        refreshToken = safeStorage.encryptString(refreshToken).toString("base64");
    } else {
        log.warn("Encryption is not available, storing refreshToken in plain text");
    }
    await accountStore.update({ refreshToken });
}

async function getToken() {
    const { token } = await accountStore.model;
    if (safeStorage.isEncryptionAvailable() && token) {
        try {
            return safeStorage.decryptString(Buffer.from(token, "base64"));
        } catch (e) {
            log.error("Failed to decrypt token, wiping account data", e);
            await wipe();
        }
    }
    return token;
}

async function getRefreshToken() {
    const { refreshToken } = await accountStore.model;
    if (safeStorage.isEncryptionAvailable() && refreshToken) {
        try {
            return safeStorage.decryptString(Buffer.from(refreshToken, "base64"));
        } catch (e) {
            log.error("Failed to decrypt refreshToken, wiping account data", e);
            await wipe();
        }
    }
    return refreshToken;
}

async function forgetToken() {
    await accountStore.update({
        token: "",
    });
}

async function wipe() {
    await accountStore.update({
        token: "",
        refreshToken: "",
    });
}

export type Account = typeof accountStore.model;
export const accountService = {
    init,
    saveToken,
    saveRefreshToken,
    getToken,
    getRefreshToken,
    wipe,
    forgetToken,
};
