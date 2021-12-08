import { Static, Type } from "@sinclair/typebox";

export enum Theme {
    Carbon = "carbon",
    Flow = "flow"
}

export const settingsSchema = Type.Strict(Type.Object({
    displayIndex: Type.Number({ default: 0 }),
    devMode: Type.Boolean({ default: false }),
    theme: Type.Enum(Theme, { default: Theme.Carbon }),
    skipIntro: Type.Boolean({ default: false }),
    sfxVolume: Type.Number({ default: 50, minimum: 0, maximum: 100 }),
    musicVolume: Type.Number({ default: 50, minimum: 0, maximum: 100 }),
}));

export type SettingsType = Static<typeof settingsSchema>;