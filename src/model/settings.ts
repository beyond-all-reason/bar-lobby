import { Static, Type } from "@sinclair/typebox";

export enum Theme {
    None = "none",
    Carbon = "carbon",
    Flow = "flow"
}

export const settingsSchema = Type.Strict(Type.Object({
    displayIndex: Type.Number({ default: 0 }),
    devMode: Type.Boolean({ default: false }),
    theme: Type.Enum(Theme, { default: Theme.Carbon }),
}));

export type SettingsType = Static<typeof settingsSchema>;