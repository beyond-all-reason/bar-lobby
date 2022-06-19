<template>
    <Modal title="settings" @open="onOpen">
        <div class="gridform">
            <div>Fullscreen</div>
            <Checkbox v-model="fullscreen" />

            <div>Display</div>
            <Select v-model="displayIndex" :options="displayOptions" optionLabel="label" optionValue="value" />

            <div>Skip Intro</div>
            <Checkbox v-model="skipIntro" />

            <div>Sfx Volume</div>
            <Range v-model="sfxVolume" :min="0" :max="100" :step="1" />

            <div>Music Volume</div>
            <Range v-model="musicVolume" :min="0" :max="100" :step="1" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, watch } from "vue";

import Modal from "@/components/common/Modal.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";

const settings = api.settings.model;
const displayOptions: Ref<Array<{ label: string; value: number }>> = ref([]);
const { fullscreen, displayIndex, skipIntro, sfxVolume, musicVolume } = api.settings.model;

watch(settings.displayIndex, async () => {
    api.info.hardware.currentDisplayIndex = settings.displayIndex.value;
});

const onOpen = () => {
    displayOptions.value = Array(api.info.hardware.numOfDisplays)
        .fill(0)
        .map((x, i) => {
            return { label: `Display ${i + 1}`, value: i };
        });
};
</script>

<style lang="scss" scoped></style>
