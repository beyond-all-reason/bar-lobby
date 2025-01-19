import { authenticate, renewAccessToken, startTokenRenewer, stopTokenRenewer } from "@main/oauth2/utils";
import { accountService } from "@main/services/account.service";
import { logger } from "@main/utils/logger";
import { ipcMain } from "electron";

const log = logger("auth-service");

function registerIpcHandlers() {
    ipcMain.handle("auth:login", async () => {
        try {
            const existingRefreshToken = await accountService.getRefreshToken();
            const { token, refreshToken, expiresIn } = existingRefreshToken ? await renewAccessToken(existingRefreshToken) : await authenticate();
            await accountService.saveToken(token);
            await accountService.saveRefreshToken(refreshToken);
            startTokenRenewer((expiresIn / 2) * 1000);
        } catch (error) {
            log.error("Error during login");
            accountService.wipe();
            throw error;
        }
    });
    ipcMain.handle("auth:logout", async () => {
        stopTokenRenewer();
        await accountService.wipe();
    });
}

export const authService = {
    registerIpcHandlers,
};
