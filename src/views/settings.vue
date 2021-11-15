<template>
    <div class="settings">
        <div class="control">
            <label for="display">Display</label>
            <select id="display" v-model="displayIndex">
                <option v-for="(displayId, index) in displays" :key="displayId" :value="displayId">
                    Display {{ index + 1 }}
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
        const displays = ref([0]);
        const displayIndex = settings.displayIndex;
        const themes = Theme;
        const theme = settings.theme;

        window.api.getHardwareInfo().then(info => {
            displays.value = Array(info.numOfDisplays).fill(0).map((x, i) => i);
        });

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
        //     displays.value = hardwareInfo.screenIds;
        // });

        // watch(selectedScreen, (selectedScreen) => {
        //     window.ipcRenderer.invoke("set-display", selectedScreen);
        // });

        return { displays, displayIndex, themes, theme };
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