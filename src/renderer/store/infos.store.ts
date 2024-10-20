import { reactive } from "vue";
import { Info } from "@main/utils/info";

export const infosStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Info);

export async function initInfosStore() {
    const currentInfos = await window.info.getInfo();
    Object.assign(infosStore, currentInfos);
    infosStore.isInitialized = true;
}
