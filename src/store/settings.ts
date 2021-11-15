import { settingsSchema, SettingsType } from "@/model/settings";
import Ajv from "ajv";
import { reactive, toRefs, watch } from "vue";

const ajv = new Ajv({ coerceTypes: true, useDefaults: true });
const settingsValidator = ajv.compile(settingsSchema);
const initialSettings = reactive({} as SettingsType);
settingsValidator(initialSettings);

export const settings = toRefs(initialSettings);

window.api.settings.getSettings().then((loadedSettings) => {
    for (const [key, value] of Object.entries(loadedSettings)) {
        if (hasSetting(key)) {
            settings[key].value = value;
        }
    }

    for (const [key, setting] of Object.entries(settings)) {
        watch(setting, () => {
            //console.log(`Setting ${key} changed to ${setting.value}`);
            window.api.settings.setSetting(key as keyof SettingsType, setting.value);
        });
    }
});

function hasSetting(key: string): key is keyof SettingsType {
    return key in settings;
}


// export class SettingsStore {
//     protected ajv = new Ajv({ coerceTypes: true, useDefaults: true });
//     protected validator = this.ajv.compile(settingsSchema);
//     protected settings: ToRefs<SettingsType>;

//     constructor(settings: SettingsType = defaultSettings) {
//         this.validator(settings);
//         this.settings = toRefs(settings);

//         for (const [k, v] of Object.entries(this.settings)) {
//             watch(v, setting => {
//                 window.api.settings.setSetting(k as keyof SettingsType, setting.value);
//             });
//         }
//     }
// }