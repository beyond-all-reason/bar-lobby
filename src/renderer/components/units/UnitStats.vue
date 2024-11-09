<template>
    <div v-if="unit" class="stats-grid">
        <div class="flex-row gap-md flex-space-between">
            <div>Metal</div>
            <span>{{ unit.buildcostmetal }}</span>
        </div>
        <ProgressBar :value="unit.buildcostmetal / 250" class="metal" :show-value="false" />

        <div class="flex-row gap-md flex-space-between">
            <div>Energy</div>
            <span>{{ unit.buildcostenergy }}</span>
        </div>
        <ProgressBar :value="unit.buildcostenergy / 900" class="energy" :show-value="false" />

        <div class="flex-row gap-md flex-space-between">
            <div>Buildtime</div>
            <span>{{ buildTimeFormatted }}</span>
        </div>
        <ProgressBar :value="unit.buildtime / 1000" class="buildtime" :show-value="false" :pt="{ value: { class: 'buildtimeasdfasdf' } }" />

        <div class="flex-row gap-md flex-space-between">
            <div>Health</div>
            <span>{{ unit.maxdamage }}</span>
        </div>
        <ProgressBar :value="unit.maxdamage / 150" class="health" :show-value="false" />

        <div class="flex-row gap-md flex-space-between">
            <div>Sight Range</div>
            <span>{{ unit.sightdistance }}</span>
        </div>
        <ProgressBar :value="unit.sightdistance / 15" class="sightdistance" :show-value="false" />

        <div class="flex-row gap-md flex-space-between" v-if="unit.maxvelocity > 0">
            <div>Speed</div>
            <span>{{ unit.maxvelocity }}</span>
        </div>
        <ProgressBar :value="unit.maxvelocity / 1.5" class="speed" :show-value="false" v-if="unit.maxvelocity > 0" />
    </div>
</template>

<script lang="ts" setup>
/**
 * Metal Cost
 *   The amount of metal required to complete construction
 * Energy Cost
 *   The amount of energy required to complete construction
 * Buildtime
 *   Time to build this unit with 100 Buildpower and available resources in minutes : seconds
 * Health
 *   Health / Hitpoints of this units determines how tough it is
 * Sight Range
 *   How far this unit can see and identify an enemy unit
 * Speed
 *   Maximum speed on normal terrain
 *
 * DPS
 *   Damage per second on average against default units
 * Weapon Range
 *   This is the maximum range of the weapon(s) of this unit
 */

// https://primevue.org/progressbar/
import ProgressBar from "primevue/progressbar";
import { Unit } from "@main/content/game/unit";
const props = defineProps<{ unit: Unit }>();

const totalBuildTimeSeconds = props.unit.buildtime / 100;
const buildTimeMinutes = Math.ceil(totalBuildTimeSeconds / 100 / 60);
const buildTimeSeconds = Math.round(totalBuildTimeSeconds % 60);
const buildTimeFormatted = `${String(buildTimeMinutes).padStart(2, "0")}:${String(buildTimeSeconds).padStart(2, "0")}`;
</script>

<style lang="scss" scoped>
.stats-grid {
    width: 100%;
    display: grid;
    grid-template-columns: max-content minmax(100px, auto);
    row-gap: 10px;
    column-gap: 20px;
}

.p-progressbar {
    height: 1.25rem;
    background: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5));
    border-radius: 5px;

    :deep(.p-progressbar-value) {
        background-color: var(--metal);
    }

    &.metal :deep(.p-progressbar-value) {
        background-color: var(--metal);
    }

    &.energy :deep(.p-progressbar-value) {
        background-color: var(--goldenrod);
    }

    &.buildtime :deep(.p-progressbar-value) {
        background: repeating-linear-gradient(45deg, yellow, yellow 10px, black 10px, black 20px);
    }

    &.health :deep(.p-progressbar-value) {
        background-color: var(--lime);
    }

    &.sightdistance :deep(.p-progressbar-value) {
        background: repeating-linear-gradient(90deg, var(--metal), var(--metal) 2px, rgba(0, 0, 0, 0.4) 2px, rgba(0, 0, 0, 0.4) 5px);
    }

    &.speed :deep(.p-progressbar-value) {
        background-color: var(--arm);
    }
}
</style>
