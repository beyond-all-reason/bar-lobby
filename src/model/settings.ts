import { Static, Type } from "@sinclair/typebox";

export enum Theme {
    Carbon = "Carbon",
    Flow = "Flow"
}

export const settingsSchema = Type.Strict(Type.Object({
    fullscreen: Type.Boolean({ default: true }),
    displayIndex: Type.Number({ default: 0 }),
    theme: Type.Enum(Theme, { default: Theme.Carbon }),
    skipIntro: Type.Boolean({ default: false }),
    sfxVolume: Type.Number({ default: 10, minimum: 0, maximum: 100 }),
    musicVolume: Type.Number({ default: 10, minimum: 0, maximum: 100 }),
}));

export type SettingsType = Static<typeof settingsSchema>;