// // import { ipcMain } from "electron";
// import * as fs from "fs";
// import * as path from "path";
// import Ajv from "ajv";
// import { Signal } from "jaz-ts-utils";

// import { settingsSchema, SettingsType } from "@/model/settings";
// import { app } from "electron";


// export class SettingsAPI {
//     protected ajv = new Ajv({ coerceTypes: true, useDefaults: true });
//     protected validator = this.ajv.compile(settingsSchema);
//     protected settingsPath = path.join(app.getPath("userData"), "settings.json");
//     protected settings: SettingsType;
//     protected settingSignals: Map<keyof SettingsType, Signal<any>> = new Map();

//     constructor() {
//         if (!fs.existsSync(this.settingsPath)) {
//             this.settings = {} as SettingsType;
//             this.validateSettings(this.settings);
//             fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 4));
//         } else {
//             this.settings = JSON.parse(fs.readFileSync(this.settingsPath, "utf8"));
//             this.validateSettings(this.settings);
//         }

//         this.apiHandlers();
//     }

//     public apiHandlers() {
//         // const handlers: SettingsMainAPI = {
//         //     getSettings: async (event) => this.getSettings(),
//         //     setSetting: async (event, key, value) => this.setSetting(key, value),
//         // };

//         // Object.entries(handlers).forEach(([key, listener]) => {
//         //     ipcMain.handle(key, listener);
//         // });
//     }

//     public getSettings() : SettingsType {
//         return this.settings;
//     }

//     public setSetting<K extends keyof SettingsType>(key: K, value: SettingsType[K]) : void {
//         if (key in this.settings) {
//             this.settings[key] = value;
//             this.settingSignals.get(key)?.dispatch(value);
//             console.log(`Writing setting to file: ${key}: ${value}`);
//             fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 4));
//         } else {
//             throw new Error(`Setting ${key} is not defined`);
//         }
//     }

//     public onSettingChanged<K extends keyof SettingsType, V extends SettingsType[K]>(key: K) : Signal<V> {
//         if (!this.settingSignals.has(key)) {
//             this.settingSignals.set(key, new Signal<V>());
//         }

//         return this.settingSignals.get(key) as Signal<V>;
//     }

//     protected validateSettings(settings: any) : settings is SettingsType {
//         const isValid = this.validator(settings);
//         return isValid;
//     }
// }