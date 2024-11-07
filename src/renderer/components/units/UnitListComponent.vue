<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <Select v-model="sortMethod" :options="sortMethods" label="Sort By" optionLabel="label" />
        </div>

        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container" style="overflow-y: scroll">
                <div class="units">
                    <TransitionGroup name="units-list">
                        <UnitTile v-for="unit in someUnits" :key="unit.unitId" :unit="unit" @click="unitSelected(unit)" />
                    </TransitionGroup>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import SearchBox from "@renderer/components/controls/SearchBox.vue";
import Select from "@renderer/components/controls/Select.vue";
import UnitTile from "@renderer/components/units/UnitTile.vue";
// import MapOverviewCard from "@renderer/components/maps/MapOverviewCard.vue";
import { Unit } from "@main/content/game/unit";

type SortMethod = { label: string; dbKey: string };

const props = defineProps<{
    units: Unit[];
}>();

const someUnits = ref(props.units.slice(0, 5));

console.log("Units", someUnits);

const sortMethods: SortMethod[] = [
    { label: "Name", dbKey: "friendlyName" },
    { label: "Size", dbKey: "width" },
];
const sortMethod: Ref<SortMethod> = ref(sortMethods.at(0));
const searchVal = ref("");
const emit = defineEmits<{
    (event: "unit-selected", unit: Unit): void;
}>();

function unitSelected(unit: Unit) {
    emit("unit-selected", unit);
}
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
