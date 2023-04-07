<template>
    <Modal ref="modal" :title="title" class="map-list-modal">
        <div class="container">
            <div class="map-container">
                <MapPreview
                    :map="props.battle.battleOptions.map"
                    :startPosType="startPosType"
                    :startBoxes="startBoxes"
                    :isSpectator="me.battleStatus.isSpectator"
                    :myTeamId="me.battleStatus.teamId"
                />
            </div>

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
                    <Button :disabled="disableBoxControls"
                            @click="setBoxType(DefaultBoxes.EastVsWest)">
                        <img src="~@/assets/images/icons/east-vs-west.png"/>
                    </Button>
                    <Button
                        :disabled="disableBoxControls"
                        @click="setBoxType(DefaultBoxes.NorthVsSouth)">
                        <img src="~@/assets/images/icons/north-vs-south.png"/>
                    </Button>
                    <Button
                        :disabled="disableBoxControls"
                        @click="setBoxType(DefaultBoxes.NortheastVsSouthwest)">
                        <img src="~@/assets/images/icons/northeast-vs-southwest.png"/>
                    </Button>
                    <Button
                        :disabled="disableBoxControls"
                        @click="setBoxType(DefaultBoxes.NorthwestVsSouthEast)">
                        <img src="~@/assets/images/icons/northwest-vs-southeast.png"/>
                    </Button>
                </div>
                <div>
                    <Range
                        v-model="boxRange"
                        :disabled="disableBoxControls"
                        :min="5" :max="100" :step="5"
                        @on-update="updateBoxSize"/>
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
import { Ref, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Options from "@/components/controls/Options.vue";
import Range from "@/components/controls/Range.vue";
import MapPreview from "@/components/maps/MapPreview.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { BattleOptions, StartBox, StartPosType } from "@/model/battle/battle-types";
import { CurrentUser } from "@/model/user";
import { DefaultBoxes, getBoxes } from "@/utils/start-boxes";

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const props = defineProps<{
    title: string;
    battle: AbstractBattle;
    battleOptions: BattleOptions;
    me: CurrentUser;
}>();

const startPosOptions: Array<{ label: string; value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes },
];

const emit = defineEmits(["setMapOptions"]);

const boxRange = ref(25);
const boxOrientation = ref(DefaultBoxes.EastVsWest);

const startBoxes = ref(props.battleOptions.startBoxes)
const startPosType = ref(props.battleOptions.startPosType)
const disableBoxControls = ref(startPosType.value === StartPosType.Fixed);

function setBoxType(type: DefaultBoxes) {
    boxOrientation.value = type;
    setBoxes(getBoxes(type, boxRange.value));
}

function setBoxes(boxes: StartBox[]) {
    startBoxes.value = boxes;
}

function updateBoxSize() {
    setBoxType(boxOrientation.value);
}

function onStartPosChange(type: StartPosType) {
    startPosType.value = type;
    disableBoxControls.value = type === StartPosType.Fixed;
}

function close() {
    modal.value?.close();
}

function save() {
    emit("setMapOptions", startPosType.value, startBoxes.value);
    modal.value?.close();
}
</script>

<style lang="scss" scoped>
:global(.map-list-modal) {
    width: 90vw;
    height: 80vh;
}

.container {
    position: relative;
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-column-gap: 10px;
    width: 100%;
    height: 100%;
}

.map-container {
    height: 100%;
}

.options {
    width: 25vw;
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

.control {
    max-height: 80px;
}

.actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-column-gap: 10px;
    padding: 10px;
    margin-top: auto;
    width: 100%;
}

</style>
