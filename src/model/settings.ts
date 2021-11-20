import { Static, Type } from "@sinclair/typebox";
import { IpcMainInvokeEvent } from "electron/common";

export enum Theme {
    None = "none",
    Carbon = "carbon",
    Flow = "flow"
}

export const settingsSchema = Type.Strict(Type.Object({
    displayIndex: Type.Number({ default: 0 }),
    devMode: Type.Boolean({ default: false }),
    theme: Type.Enum(Theme, { default: Theme.None }),
}));

export type SettingsType = Static<typeof settingsSchema>;

export interface ISettingsAPI {
    getSettings() : SettingsType;
    setSetting<K extends keyof SettingsType>(settingKey: K, value: SettingsType[K]) : void;
}

export type SettingsMainAPI = { [K in keyof ISettingsAPI]: (event: IpcMainInvokeEvent, ...args: Parameters<ISettingsAPI[K]>) => Promise<ReturnType<ISettingsAPI[K]>> }

export type SettingsRenderAPI = { [K in keyof ISettingsAPI]: (...args: Parameters<ISettingsAPI[K]>) => Promise<ReturnType<ISettingsAPI[K]>> };