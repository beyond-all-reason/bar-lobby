<template>
    <Modal v-if="settingsOpen" title="Settings" @close="settingsOpen = false">
        <form class="grid gap-md">
            <div>Display</div>
            <Select v-model="displayIndex" :options="displays" :label-by="option => `Display ${option + 1}`" />

            <div>Theme</div>
            <Select v-model="theme" :options="themes" />

            <div>Skip Intro</div>
            <Checkbox v-model="skipIntro" />

            <div>Sfx Volume</div>
            <Range v-model="sfxVolume" :min="0" :max="100" :interval="1" />

            <div>Music Volume</div>
            <Range v-model="musicVolume" :min="0" :max="100" :interval="1" />
        </form>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { Theme } from "@/model/settings";
import { ipcRenderer } from "electron";

export default defineComponent({
    setup() {
        const { settingsOpen } = window.api.session;
        const settings = window.api.settings.model;
        const displays = ref(Array(window.info.hardware.numOfDisplays).fill(0).map((x, i) => i));
        const themes = Object.values(Theme);

        watch(settings.displayIndex, async () => {
            ipcRenderer.invoke("setDisplay", settings.displayIndex.value);
            window.info.hardware.currentDisplayIndex = settings.displayIndex.value;
        });

        return { settingsOpen, displays, themes, ...settings };
    }
});
</script>