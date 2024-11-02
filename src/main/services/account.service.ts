import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { accountSchema } from "@main/json/model/account";

import { ipcMain } from "electron";
import path from "path";

const accountStore = new FileStore<typeof accountSchema>(path.join(CONFIG_PATH, "account.json"), accountSchema);

function init() {
    accountStore.init();
}

function getAccount() {
    return accountStore.model;
}

async function updateAccount(data: Partial<typeof accountSchema>) {
    await accountStore.update(data);
}

function registerIpcHandlers() {
    ipcMain.handle("account:get", async () => {
        return getAccount();
    });
    ipcMain.handle("account:update", async (_event, data: Partial<typeof accountSchema>) => {
        return updateAccount(data);
    });
}

export type Account = typeof accountStore.model;
export const accountService = {
    init,
    registerIpcHandlers,
    getAccount,
    updateAccount,
};
