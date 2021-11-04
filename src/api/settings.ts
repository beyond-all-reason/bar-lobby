import { defaultSettings, SettingsType } from "@/model/settings";
import * as fs from "fs";

export interface SettingsAPIConfig extends Record<string, unknown> {
    settingsFilePath: string;
}

export type SettingsAPIFactory = (config: SettingsAPIConfig) => Promise<SettingsType>;

export const settingsAPIFactory = async function(config: SettingsAPIConfig) {
    let settings = defaultSettings;

    // TODO: use read/write stream
    if (fs.existsSync(config.settingsFilePath)) {
        settings = JSON.parse(await fs.promises.readFile(config.settingsFilePath, "utf8"));
    } else {
        await fs.promises.writeFile(config.settingsFilePath, JSON.stringify(settings));
    }

    return {
        get<K extends keyof SettingsType>(key: K) : SettingsType[K] {
            return settings[key];
        },
        set<K extends keyof SettingsType, V extends SettingsType[K]>(key: K, value: V) {
            fs.promises.writeFile(config.settingsFilePath, JSON.stringify(settings));
            settings[key] = value;
        }
    };
};