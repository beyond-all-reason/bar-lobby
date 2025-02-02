import { accountService } from "@main/services/account.service";
import { TachyonClient, TachyonClientRequestHandlers } from "@main/tachyon/tachyon-client";
import { logger } from "@main/utils/logger";
import { ipcMain } from "electron";
import { BattleStartRequestData } from "tachyon-protocol/types";

const log = logger("tachyon-service");

function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
    const requestHandlers: TachyonClientRequestHandlers = {
        "battle/start": async (data: BattleStartRequestData) => {
            log.info(`Received battle start request: ${JSON.stringify(data)}`);
            const { ip, port, username, password } = data;
            const springString = `spring://${username}:${password}@${ip}:${port}`;
            mainWindow.webContents.send("tachyon:battleStart", springString);
            return {
                status: "success",
            };
        },
    };
    const tachyonClient = new TachyonClient(requestHandlers);

    tachyonClient.onSocketOpen.add(() => {
        log.info("Connected to Tachyon server");
        mainWindow.webContents.send("tachyon:connected");
    });

    tachyonClient.onSocketClose.add(() => {
        log.info("Disconnected from Tachyon server");
        mainWindow.webContents.send("tachyon:disconnected");
    });

    tachyonClient.onEvent.add((event) => {
        log.info(`Received event: ${JSON.stringify(event)}`);
        mainWindow.webContents.send("tachyon:event", event);
    });

    ipcMain.handle("tachyon:isConnected", () => {
        return tachyonClient.isConnected();
    });

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

    ipcMain.handle("tachyon:sendEvent", async (_event, data) => {
        return await tachyonClient.sendEvent(data);
    });

    ipcMain.handle("tachyon:request", async (_event, command, args) => {
        return await tachyonClient.request(command, args);
    });
}

export const tachyonService = {
    registerIpcHandlers,
};
