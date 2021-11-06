import { defaultSettings } from "@/model/settings";
import { createStore } from "vuex";

export const settingsStore = createStore({
    state: {
        ...defaultSettings
    },
    getters: {
    },
    mutations: {
    },
    actions: {
    },
    modules: {
    }
});