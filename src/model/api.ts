import { HardwareInfo } from "@/model/hardware-info";
import { SettingsRenderAPI } from "@/model/settings";

export interface IpcHandlers {
    getHardwareInfo: () => Promise<HardwareInfo>;
}

export interface API extends IpcHandlers {
    settings: SettingsRenderAPI;
}

declare global {
    interface Window {
        api: API;
    }
}