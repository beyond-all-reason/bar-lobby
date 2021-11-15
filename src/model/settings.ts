import { Static, Type } from "@sinclair/typebox";
import { IpcMainInvokeEvent } from "electron/common";

export enum Theme {
    None = "none",
    Carbon = "carbon"
}

export const settingsSchema = Type.Strict(Type.Object({
    displayIndex: Type.Number({ default: 0 }),
    devMode: Type.Boolean({ default: false }),
    theme: Type.Enum(Theme, { default: Theme.None }),
}));

export type SettingsType = Static<typeof settingsSchema>;

export interface SettingsAPI {
    getSettings() : SettingsType;
    setSetting<K extends keyof SettingsType>(settingKey: K, value: SettingsType[K]) : void;
}

export type SettingsMainAPI = { [K in keyof SettingsAPI]: (event: IpcMainInvokeEvent, ...args: Parameters<SettingsAPI[K]>) => Promise<ReturnType<SettingsAPI[K]>> }

export type SettingsRenderAPI = { [K in keyof SettingsAPI]: (...args: Parameters<SettingsAPI[K]>) => Promise<ReturnType<SettingsAPI[K]>> };