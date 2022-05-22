import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import * as os from "os";
import * as path from "path";

// TODO: eventually content dir should be shared with the installation dir
let defaultDataDir = "";
if (process.platform === "win32") {
    defaultDataDir = path.join(os.homedir(), "Documents", "My Games", "Spring");
} else if (process.platform === "linux") {
    defaultDataDir = path.join(os.homedir(), ".spring");
}

export const settingsSchema = Type.Strict(
    Type.Object({
        dataDir: Type.String({ default: defaultDataDir }),
        fullscreen: Type.Boolean({ default: true }),
        displayIndex: Type.Number({ default: 0 }),
        skipIntro: Type.Boolean({ default: false }),
        sfxVolume: Type.Number({ default: 10, minimum: 0, maximum: 100 }),
        musicVolume: Type.Number({ default: 10, minimum: 0, maximum: 100 }),
        loginAutomatically: Type.Boolean({ default: true }),
    })
);

export type SettingsType = Static<typeof settingsSchema>;
