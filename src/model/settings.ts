import * as os from "os";
import * as path from "path";
import type { Static} from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";

export enum Theme {
    Carbon = "Carbon",
    Flow = "Flow"
}

let defaultDataDir = "";
if (process.platform === "win32") {
    defaultDataDir = path.join(os.homedir(), "Documents", "My Games", "Spring");
} else if (process.platform === "linux") {
    defaultDataDir = path.join(os.homedir(), ".spring");
}

export const settingsSchema = Type.Strict(Type.Object({
    dataDir: Type.String({ default: defaultDataDir }),
    fullscreen: Type.Boolean({ default: true }),
    displayIndex: Type.Number({ default: 0 }),
    theme: Type.Enum(Theme, { default: Theme.Carbon }),
    skipIntro: Type.Boolean({ default: false }),
    sfxVolume: Type.Number({ default: 10, minimum: 0, maximum: 100 }),
    musicVolume: Type.Number({ default: 10, minimum: 0, maximum: 100 }),
    loginAutomatically: Type.Boolean({ default: true }),
}));

export type SettingsType = Static<typeof settingsSchema>;