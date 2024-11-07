<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container" style="overflow-y: scroll">
                <div class="units">
                    <TransitionGroup name="units-list">
                        {{ unit.unitId }}
                    </TransitionGroup>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import { Unit } from "@main/content/game/unit";

const props = defineProps<{
    unit: Unit;
}>();
</script>

<style lang="scss" scoped>
.maps {
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    padding-right: 10px;
}

// Transition
.maps-list-move,
.maps-list-enter-active,
.maps-list-leave-active {
    transition: all 0.5s ease;
}
.maps-list-enter-from,
.maps-list-leave-to {
    opacity: 0;
    // transform: translateX(0, 30px);
}
.maps-list-leave-active {
    position: absolute;
}
</style>
