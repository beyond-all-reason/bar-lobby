<template>
    <Modal name="settings">
        <form class="settings">
            <div class="flex-row flex-center-items">
                Fullscreen
            </div>
            <Checkbox v-model="fullscreen" />

            <div class="flex-row flex-center-items">
                Display
            </div>
            <Select v-model="displayIndex" :options="displays" :label-by="(option: string) => `Display ${option + 1}`" />

            <div class="flex-row flex-center-items">
                Theme
            </div>
            <Select v-model="theme" :options="themes" />

            <div class="flex-row flex-center-items">
                Skip Intro
            </div>
            <Checkbox v-model="skipIntro" />

            <div class="flex-row flex-center-items">
                Sfx Volume
            </div>
            <Range v-model="sfxVolume" :min="0" :max="100" :interval="1" />

            <div class="flex-row flex-center-items">
                Music Volume
            </div>
            <Range v-model="musicVolume" :min="0" :max="100" :interval="1" />
        </form>
    </Modal>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { Theme } from "@/model/settings";
import Modal from "@/components/common/Modal.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";

const settings = window.api.settings.model;
const displays = ref(Array(window.api.info.hardware.numOfDisplays).fill(0).map((x, i) => i));
const themes = Object.values(Theme);
const { fullscreen, displayIndex, theme, skipIntro, sfxVolume, musicVolume } = window.api.settings.model;

watch(settings.displayIndex, async () => {
    window.api.info.hardware.currentDisplayIndex = settings.displayIndex.value;
});
</script>