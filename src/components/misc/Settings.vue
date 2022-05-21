<template>
    <Modal name="settings">
        <div class="gridform">
            <div>
                Fullscreen
            </div>
            <Checkbox v-model="fullscreen" />

            <div>
                Display
            </div>
            <Select v-model="displayIndex" :options="displays" :labelBy="(option: string) => `Display ${option + 1}`" />

            <div>
                Theme
            </div>
            <Select v-model="theme" :options="themes" />

            <div>
                Skip Intro
            </div>
            <Checkbox v-model="skipIntro" />

            <div>
                Sfx Volume
            </div>
            <Range v-model="sfxVolume" :min="0" :max="100" :interval="1" />

            <div>
                Music Volume
            </div>
            <Range v-model="musicVolume" :min="0" :max="100" :interval="1" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { Theme } from "@/model/settings";
import Modal from "@/components/common/Modal.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";

const settings = api.settings.model;
const displays = ref(Array(api.info.hardware.numOfDisplays).fill(0).map((x, i) => i));
const themes = Object.values(Theme);
const { fullscreen, displayIndex, theme, skipIntro, sfxVolume, musicVolume } = api.settings.model;

watch(settings.displayIndex, async () => {
    api.info.hardware.currentDisplayIndex = settings.displayIndex.value;
});
</script>