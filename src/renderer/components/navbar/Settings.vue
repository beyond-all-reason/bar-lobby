<template>
    <Modal title="settings" @open="onOpen">
        <div class="gridform">
            <div>Fullscreen</div>
            <Checkbox v-model="settings.fullscreen" />

            <div>Display</div>
            <Select v-model="settings.displayIndex" :options="displayOptions" optionLabel="label" optionValue="value" />

            <div>Skip Intro</div>
            <Checkbox v-model="settings.skipIntro" />

            <div>Sfx Volume</div>
            <Range v-model="settings.sfxVolume" :min="0" :max="100" :step="1" />

            <div>Music Volume</div>
            <Range v-model="settings.musicVolume" :min="0" :max="100" :step="1" />

            <div>Dev Mode</div>
            <Checkbox v-model="settings.devMode" />

            <div>Login Automatically</div>
            <Checkbox v-model="settings.loginAutomatically" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, watch } from "vue";

import Modal from "@/components/common/Modal.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import Range from "@/components/controls/Range.vue";
import Select from "@/components/controls/Select.vue";

const settings = api.settings.model;
const displayOptions: Ref<Array<{ label: string; value: number }>> = ref([]);

watch(
    () => settings.displayIndex,
    async () => {
        api.info.hardware.currentDisplayIndex = settings.displayIndex;
    }
);

function onOpen() {
    console.log("test");

    displayOptions.value = Array(api.info.hardware.numOfDisplays)
        .fill(0)
        .map((x, i) => {
            return { label: `Display ${i + 1}`, value: i };
        });
}
</script>

<style lang="scss" scoped></style>
