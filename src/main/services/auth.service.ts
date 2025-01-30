import { authenticate, renewAccessToken, startTokenRenewer, stopTokenRenewer } from "@main/oauth2/oauth2";
import { accountService } from "@main/services/account.service";
import { logger } from "@main/utils/logger";
import { ipcMain } from "electron";

const log = logger("auth-service");

function registerIpcHandlers() {
    ipcMain.handle("auth:login", async () => {
        try {
            const existingRefreshToken = await accountService.getRefreshToken();
            const { token, refreshToken, expiresIn } = existingRefreshToken ? await renewAccessToken() : await authenticate();
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
        await accountService.forgetToken();
    });
    ipcMain.handle("auth:wipe", async () => {
        stopTokenRenewer();
        await accountService.wipe();
    });
    ipcMain.handle("auth:hasCredentials", async () => {
        const refreshToken = await accountService.getRefreshToken();
        return !!refreshToken;
    });
}

export const authService = {
    registerIpcHandlers,
};
