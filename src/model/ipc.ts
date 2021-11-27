import { HardwareInfo } from "@/model/hardware-info";

declare module "electron" {
    interface IpcMain {
        handle(channel: "getVersion", listener: (event: IpcMainInvokeEvent) => Promise<string>): void;
        handle(channel: "getSettingsPath", listener: (event: IpcMainInvokeEvent) => Promise<string>): void;
        handle(channel: "getHardwareInfo", listener: (event: IpcMainInvokeEvent) => Promise<HardwareInfo>): void;
        handle(channel: "setDisplay", listener: (event: IpcMainInvokeEvent, displayIndex: number) => Promise<void>): void;
    }
    interface IpcRenderer {
        invoke(channel: "getVersion"): Promise<string>;
        invoke(channel: "getSettingsPath"): Promise<string>;
        invoke(channel: "getHardwareInfo"): Promise<HardwareInfo>;
        invoke(channel: "setDisplay", displayIndex: number): Promise<void>;
    }
}