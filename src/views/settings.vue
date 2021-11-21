<template>
    <Panel class="settings">
        <Select v-model="displayIndex" :options="displays" label="Display" :label-by="option => `Display ${option + 1}`" />
        <Select v-model="theme" :options="themes" label="Theme" />
        <Checkbox v-model="skipIntro" label="Skip Intro" />
    </Panel>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { Theme } from "@/model/settings";
import { ipcRenderer } from "electron";

export default defineComponent({
    setup() {
        const { displayIndex, theme, skipIntro } = window.settings;
        const displays = ref([0]);
        const themes = Object.values(Theme);

        ipcRenderer.invoke("getHardwareInfo").then(info => {
            displays.value = Array(info.numOfDisplays).fill(0).map((x, i) => i);
        });

        watch(displayIndex, () => {
            ipcRenderer.invoke("setDisplay", displayIndex.value);
        });

        return { displays, displayIndex, themes, theme, skipIntro };
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