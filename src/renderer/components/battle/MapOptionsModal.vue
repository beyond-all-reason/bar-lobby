<template>
    <Modal ref="modal" title="Map options">
        <div class="container">
            <div class="map-preview-container">
                <MapBattlePreview />
            </div>
            <div class="options flex-col gap-md">
                <div v-if="battleStore.battleOptions.map.startboxesSet">
                    <h4>Boxes presets</h4>
                    <div class="box-buttons">
                        <Button
                            v-for="(boxSet, i) in battleStore.battleOptions.map.startboxesSet"
                            :key="i"
                            @click="
                                () => {
                                    delete battleStore.battleOptions.mapOptions.fixedPositionsIndex;
                                    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Boxes;
                                    battleStore.battleOptions.mapOptions.startBoxesIndex = i;
                                }
                            "
                            :disabled="battleStore.battleOptions.mapOptions.startBoxesIndex === i"
                        >
                            <span>{{ i + 1 }}</span>
                        </Button>
                    </div>
                </div>
                <div class="flex-col gap-sm">
                    <h4>Custom boxes</h4>
                    <div class="box-buttons">
                        <Button>
                            <img src="/assets/images/icons/east-vs-west.png" />
                        </Button>
                        <Button>
                            <img src="/assets/images/icons/north-vs-south.png" />
                        </Button>
                        <Button>
                            <img src="/assets/images/icons/northeast-vs-southwest.png" />
                        </Button>
                        <Button>
                            <img src="/assets/images/icons/northwest-vs-southeast.png" />
                        </Button>
                    </div>
                    <div class="box-buttons">
                        <Range v-model="customBoxRange" :min="5" :max="100" :step="5" />
                    </div>
                </div>
                <div>
                    <h4>Fixed positions</h4>
                    <div class="box-buttons">
                        <Button
                            v-for="(teamSet, i) in battleStore.battleOptions.map.startPos?.team"
                            :key="`team${i}`"
                            @click="
                                () => {
                                    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
                                    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Fixed;
                                    battleStore.battleOptions.mapOptions.fixedPositionsIndex = i;
                                }
                            "
                            :disabled="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Fixed"
                            ><span>{{ i + 1 }}</span></Button
                        >
                        <Button>
                            <span>Random</span>
                        </Button>
                    </div>
                </div>
                <div class="actions">
                    <Button class="green fullwidth" @click="close">Close</Button>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, watch } from "vue";

import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Range from "@renderer/components/controls/Range.vue";
import { battleStore } from "@renderer/store/battle.store";
import { StartPosType } from "@main/game/battle/battle-types";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const customBoxRange = ref(25);

watch(
    () => battleStore.battleOptions.map,
    () => {
        customBoxRange.value = 25;
    }
);

function close() {
    modal.value?.close();
}
</script>

<style lang="scss" scoped>
.container {
    height: 80vh;
    position: relative;
    display: flex;
    gap: 10px;
}

.map-preview-container {
    aspect-ratio: 1;
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
            span {
                opacity: 1;
            }
        }
    }
    img {
        max-width: 50px;
        image-rendering: pixelated;
        opacity: 0.7;
    }
    span {
        min-width: 50px;
        opacity: 0.7;
        font-size: 2rem;
    }
}

.options {
    width: 100%;
}

.control {
    max-height: 80px;
}

.actions {
    margin-top: auto;
    width: 100%;
}
</style>
