<template>
    <div class="unit flex-row" :class="{ [view]: true }">
        <UnitImage :unit="unit" />
        <div class="unit-details flex-col gap-md padding-md">
            <div class="name">
                {{ unit.unitName }}
            </div>
            <div class="description" :class="{ [faction]: true }">{{ unit.unitDescription }}</div>
            <UnitStats :unit="unit" v-if="view === 'list'" />
        </div>
        <div class="unit-tech">{{ unit.techLevel }}</div>
    </div>
</template>

<script lang="ts" setup>
import { Unit } from "@main/content/game/unit";
import UnitImage from "@renderer/components/units/UnitImage.vue";
import UnitStats from "@renderer/components/units/UnitStats.vue";
import { ref } from "vue";

const props = defineProps<{
    unit: Unit;
    view: "list" | "grid";
}>();

const faction = ref(props.unit.unitId.slice(0, 3));
</script>

<style lang="scss" scoped>
.unit {
    will-change: transform, opacity;
    position: relative;
    overflow: hidden;
    background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0));
    &:after {
        @extend .fullsize;
        box-shadow:
            inset 0 1px 0 rgba(0, 0, 0, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3),
            inset 1px 0 0 rgba(0, 0, 0, 0.3),
            inset -1px 0 0 rgba(0, 0, 0, 0.3);
        border: 3px solid rgba(0, 0, 0, 0.2);
        z-index: 5;
    }
    &:hover {
        .name {
            opacity: 0.5;
        }
        :deep(.background) {
            transform: scale(1.1);
            &:after {
                opacity: 0;
            }
        }
    }
}
.unit.grid {
    aspect-ratio: 1;
    :deep(.unit-image) {
        width: 100%;
    }
    .unit-details {
        position: absolute;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: end;
        text-align: center;
    }
}
.unit.list {
    // aspect-ratio: 2;
    :deep(.unit-image) {
        width: 250px;
    }
    .unit-details {
        // position: absolute;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        padding-bottom: 24px;
    }
}
.name {
    word-break: break-word;
    font-size: 18px;
    font-weight: 600;
    text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
    transition: 0.2s opacity;
}
.description {
    font-size: 14px;
    color: var(--metal);
    &.arm {
        color: var(--arm);
    }
    &.cor {
        color: var(--core);
    }
    &.leg {
        color: var(--blue-violet);
    }
}
.unit-tech {
    position: absolute;
    top: 10px;
    left: 10px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.2);
    font-size: 16px;
    font-weight: 600;
    padding: 2px 5px;
    transition: 0.2s opacity;
}
</style>
