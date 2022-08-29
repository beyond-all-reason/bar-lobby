import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";

export const settingsSchema = Type.Strict(
    Type.Object({
        fullscreen: Type.Boolean({ default: true }),
        displayIndex: Type.Number({ default: 0 }),
        skipIntro: Type.Boolean({ default: false }),
        sfxVolume: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
        musicVolume: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
        loginAutomatically: Type.Boolean({ default: true }),
    })
);

export type SettingsType = Static<typeof settingsSchema>;
