// import { defaultSettings, settingsSchema, SettingsType } from "@/model/settings";
// import * as fs from "fs";
// import Ajv from "ajv";

// export interface SettingsAPI {
//     get(): Promise<SettingsType | void>;
//     set(settings: SettingsType): Promise<boolean>;
// }

// const ajv = new Ajv();
// const settingsValidator = ajv.compile(settingsSchema);

// const settingsPath = path.join(app.getPath("userData"), "settings.json")

// export const settingsAPIFactory: () => Promise<SettingsAPI> = async function() {
//     let settings: SettingsType = defaultSettings;

//     // TODO: use read/write stream

//     if (!fs.existsSync(config.settingsFilePath)) {
//         await fs.promises.writeFile(config.settingsFilePath, JSON.stringify(settings));
//     }

//     return {
//         async get() {
//             try {
//                 const loadedSettings = JSON.parse(await fs.promises.readFile(config.settingsFilePath, "utf8"));

//                 if (validateSettings(loadedSettings)) {
//                     settings = loadedSettings;
//                     return settings;
//                 } else {
//                     throw new Error(`Invalid Settings: ${settingsValidator.errors}`);
//                 }
//             } catch (err) {
//                 console.error(err);
//             }
//         },
//         async set(newSettings) {
//             try {
//                 if (validateSettings(newSettings)) {
//                     settings = newSettings;
//                     await fs.promises.writeFile(config.settingsFilePath, JSON.stringify(settings));
//                     return true;
//                 } else {
//                     throw new Error(`Invalid Settings: ${settingsValidator.errors}`);
//                 }
//             } catch (err) {
//                 console.error(err);
//                 return false;
//             }
//         }
//     };
// };

// function validateSettings(settings: any) : settings is SettingsType {
//     return settingsValidator(settings);
// }

// declare global {
//     interface Window {
//         api: {
//             settings: SettingsAPI;
//         }
//     }
// }