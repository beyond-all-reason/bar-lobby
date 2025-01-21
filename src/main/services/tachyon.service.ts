import { accountService } from "@main/services/account.service";
import { TachyonClient, TachyonClientRequestHandlers } from "@main/tachyon/tachyon-client";
import { logger } from "@main/utils/logger";
import { ipcMain } from "electron";

const log = logger("tachyon-service");

function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
    const requestHandlers: TachyonClientRequestHandlers = {
        "battle/start": async (data) => {
            log.info(`Received battle start request: ${JSON.stringify(data)}`);
            mainWindow.webContents.send("tachyon:battleStart", data);
            return {
                status: "success",
            };
        },
    };
    const tachyonClient = new TachyonClient(requestHandlers);
    tachyonClient.onEvent();

    ipcMain.handle("tachyon:connect", async () => {
        if (!tachyonClient.isConnected()) {
            const token = await accountService.getToken();
            if (!token) {
                throw new Error("Not authenticated");
            }
            return await tachyonClient.connect(token);
        }
    });

    ipcMain.handle("tachyon:disconnect", async () => {
        if (tachyonClient.isConnected()) {
            return await tachyonClient.disconnect();
        }
    });

    ipcMain.handle("tachyon:req:battleStart", async (_event, success) => {});
}

export const tachyonService = {
    registerIpcHandlers,
};
