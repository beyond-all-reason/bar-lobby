import { ipcMain } from "electron";
import { fetchImage } from "@main/utils/background/image";

function registerIpcHandlers() {
    ipcMain.handle("units:fetchUnitImage", async (_, imageUrl: string) => await fetchImage(imageUrl));
}

const unitsService = {
    registerIpcHandlers,
};

export default unitsService;
