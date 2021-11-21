<template>
    <Panel class="settings">
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
    </Panel>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { Theme } from "@/model/settings";
import { ipcRenderer } from "electron";

export default defineComponent({
    setup() {
        const displays = ref([0]);
        const displayIndex = window.settings.displayIndex;
        const themes = Theme;
        const theme = window.settings.theme;

        ipcRenderer.invoke("getHardwareInfo").then(info => {
            displays.value = Array(info.numOfDisplays).fill(0).map((x, i) => i);
        });

        watch(displayIndex, () => {
            ipcRenderer.invoke("setDisplay", displayIndex.value);
        });

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