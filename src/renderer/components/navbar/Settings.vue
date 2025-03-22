<template>
    <Modal title="settings">
        <div class="gridform">
            <div>Fullscreen</div>
            <Checkbox v-model="settingsStore.fullscreen" />

            <div>Window Size</div>
            <Select v-model="settingsStore.size" :options="sizeOptions" optionLabel="label" optionValue="value" />

            <div>Display</div>
            <Select v-model="settingsStore.displayIndex" :options="displayOptions" optionLabel="label" optionValue="value" />

            <div>Skip Intro</div>
            <Checkbox v-model="settingsStore.skipIntro" />

            <div>Login Automatically</div>
            <Checkbox v-model="settingsStore.loginAutomatically" />

            <div>Sfx Volume</div>
            <Range v-model="settingsStore.sfxVolume" :min="0" :max="100" :step="1" />

            <div>Music Volume</div>
            <Range v-model="settingsStore.musicVolume" :min="0" :max="100" :step="1" />

            <div>Dev Mode</div>
            <Checkbox v-model="settingsStore.devMode" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@renderer/components/common/Modal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import { asyncComputed } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";
import { infosStore } from "@renderer/store/infos.store";

const sizeOptions = [
    { label: "1920x1080", value: 1080 },
    { label: "1440x900", value: 900 },
    { label: "1280x720", value: 720 },
];

const displayOptions = asyncComputed(async () => {
    return Array(infosStore.hardware.numOfDisplays)
        .fill(0)
        .map((_, i) => {
            return { label: `Display ${i + 1}`, value: i };
        });
});
</script>

<style lang="scss" scoped></style>
