import { Static, Type } from "@sinclair/typebox";

export const settingsSchema = Type.Strict(Type.Object({
    displayIndex: Type.Number(),
    devMode: Type.Boolean(),
}));

export type SettingsType = Static<typeof settingsSchema>;

export const defaultSettings: SettingsType = {
    displayIndex: 0,
    devMode: false,
};