<template>
    <Modal ref="modal" :title="title" class="map-list-modal">
        <div class="container">
            <MapPreview :map="map" :currentUser="me" :startPosType="startPosType" :startBoxes="startBoxes" />

            <div class="options flex-col gap-md">
                <Options
                    :modelValue="startPosType"
                    :options="startPosOptions"
                    label="Start Pos"
                    optionLabel="label"
                    optionValue="value"
                    :unselectable="false"
                    class="fullwidth"
                    @update:model-value="onStartPosChange"
                />
                <div class="box-buttons">
                    <Button :disabled="disableBoxControls" @click="setBoxType(StartBoxOrientation.EastVsWest)">
                        <img src="/images/icons/east-vs-west.png" />
                    </Button>
                    <Button :disabled="disableBoxControls" @click="setBoxType(StartBoxOrientation.NorthVsSouth)">
                        <img src="/images/icons/north-vs-south.png" />
                    </Button>
                    <Button :disabled="disableBoxControls" @click="setBoxType(StartBoxOrientation.NortheastVsSouthwest)">
                        <img src="/images/icons/northeast-vs-southwest.png" />
                    </Button>
                    <Button :disabled="disableBoxControls" @click="setBoxType(StartBoxOrientation.NorthwestVsSouthEast)">
                        <img src="/images/icons/northwest-vs-southeast.png" />
                    </Button>
                </div>
                <div>
                    <Range v-model="boxRange" :disabled="disableSlider" :min="5" :max="100" :step="5" />
                </div>
                <div class="actions">
                    <Button class="red fullwidth" @click="close"> Cancel</Button>
                    <Button class="green fullwidth" @click="save"> Save</Button>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, watch } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Options from "@/components/controls/Options.vue";
import Range from "@/components/controls/Range.vue";
import MapPreview from "@/components/maps/MapPreview.vue";
import { StartBox, StartPosType } from "@/model/battle/battle-types";
import { MapData } from "@/model/cache/map-data";
import { CurrentUser } from "@/model/user";
import { getBoxes, StartBoxOrientation } from "@/utils/start-boxes";

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const props = defineProps<{
    title: string;
    map: MapData;
    startBoxes: Record<number, StartBox>;
    startPosType: StartPosType;
    me: CurrentUser;
}>();

const boxRange = ref(25);
const startBoxes = ref(props.startBoxes);
const startPosType = ref(props.startPosType);
const disableBoxControls = ref(startPosType.value === StartPosType.Fixed);
const disableSlider = ref(false);

let boxOrientation: StartBoxOrientation | undefined = undefined;

watch(boxRange, () => {
    updateBoxSize();
});

watch(
    () => props.startBoxes,
    (boxes) => {
        if (Object.keys(boxes).length > 1) {
            setBoxes(Object.entries(boxes).map(([k, v]) => v));
        }

        boxOrientation = undefined;
        updateOrientation();
    }
);

const startPosOptions: Array<{ label: string; value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes },
];

const emit = defineEmits(["setMapOptions"]);

function getBoxOrientation() {
    const boxes = startBoxes.value;
    const count = Object.keys(boxes).length;
    // I don't really care enough to build in support for diagonal boxes right now
    if (count === 2) {
        if (boxes[0]?.yPercent === 0 && boxes[1]?.yPercent === 0) {
            return StartBoxOrientation.EastVsWest;
        }
        if (boxes[0]?.xPercent === 0 && boxes[1]?.xPercent === 0) {
            return StartBoxOrientation.NorthVsSouth;
        }
    }
    return undefined;
}

function updateOrientation() {
    disableSlider.value = startPosType.value === StartPosType.Fixed || !getBoxOrientation();
}

function setBoxType(type: StartBoxOrientation) {
    boxOrientation = type;
    setBoxes(getBoxes(type, boxRange.value));
}

function setBoxes(boxes: StartBox[]) {
    startBoxes.value = boxes;
}

function updateBoxSize() {
    const orientation = boxOrientation || getBoxOrientation();
    if (orientation) {
        setBoxType(orientation);
    }
}

function onStartPosChange(type: StartPosType) {
    startPosType.value = type;
    disableBoxControls.value = type === StartPosType.Fixed;
}

function close() {
    modal.value?.close();
}

function save() {
    emit("setMapOptions", startPosType.value, getBoxOrientation(), boxRange.value);
    modal.value?.close();
}
</script>

<style lang="scss" scoped>
.container {
    position: relative;
    display: flex;
    gap: 10px;
}
.box-buttons {
    display: flex;
    flex-direction: row;
    gap: 5px;
    :deep(button) {
        padding: 5px;
        &:hover {
            img {
                opacity: 1;
            }
        }
    }
    img {
        max-width: 50px;
        image-rendering: pixelated;
        opacity: 0.7;
    }
}
.options {
    width: 100%;
}
.control {
    max-height: 80px;
}
.actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-column-gap: 10px;
    margin-top: auto;
    width: 100%;
}
</style>
