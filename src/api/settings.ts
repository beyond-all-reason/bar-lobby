import { defaultSettings, SettingsType } from "@/model/settings";
import * as fs from "fs";

export interface SettingsAPIConfig extends Record<string, unknown> {
    settingsFilePath: string;
}

export interface SettingsAPI {
    get<K extends keyof SettingsType>(key: K): SettingsType[K]
    set<K extends keyof SettingsType, V extends SettingsType[K]>(key: K, value: V): void;
}

export const settingsAPIFactory: (config: SettingsAPIConfig) => Promise<SettingsAPI> = async function(config) {
    let settings = defaultSettings;

    // TODO: use read/write stream
    if (fs.existsSync(config.settingsFilePath)) {
        settings = JSON.parse(await fs.promises.readFile(config.settingsFilePath, "utf8"));
    } else {
        await fs.promises.writeFile(config.settingsFilePath, JSON.stringify(settings));
    }

    return {
        get(key) {
            return settings[key];
        },
        set(key, value) {
            fs.promises.writeFile(config.settingsFilePath, JSON.stringify(settings));
            settings[key] = value;
        }
    };
};

declare global {
    interface Window {
        api: {
            settings: SettingsAPI;
        }
    }
}