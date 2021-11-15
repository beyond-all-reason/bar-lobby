<template>
    <div class="settings">
        <div class="control">
            <label for="screen">Screen</label>
            <select id="screen" v-model="selectedScreen">
                <option v-for="(screenId, index) in screenIds" :key="screenId" :value="screenId">
                    Screen {{ index + 1 }}
                </option>
            </select>
        </div>

        <div class="control">
            <label for="theme">Theme</label>
            <select id="theme" v-model="theme">
                <option v-for="(themeKey, themeVal) in themes" :key="themeKey" :value="themeKey">{{ themeVal }}</option>
            </select>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { Theme } from "@/model/settings";
import { settings } from "@/store/settings";

export default defineComponent({
    setup() {
        const screenIds = ref([0]);
        const selectedScreen = ref(0);
        const themes = Theme;
        const theme = settings.theme;

        //const hardwareInfo = await window.ipcRenderer.invoke("get-hardware-info");
        //screenIds.value = hardwareInfo.screenIds;

        // window.getHardwareInfo().then((hardwareInfo) => {
        //     screenIds.value = hardwareInfo.screenIds;
        // });

        // scope.run(() => {
        //     watch(selectedScreen, (selectedScreen) => {
        //         window.setDisplay(selectedScreen);
        //     });
        // });

        // window.ipcRenderer.invoke("get-hardware-info").then((hardwareInfo) => {
        //     screenIds.value = hardwareInfo.screenIds;
        //     selectedScreen.value = hardwareInfo.currentScreenId;
        // });

        // watch(selectedScreen, (selectedScreen) => {
        //     window.ipcRenderer.invoke("set-display", selectedScreen);
        // });

        return { screenIds, selectedScreen, themes, theme };
    }
});
</script>

<style scoped lang="scss">
.settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>