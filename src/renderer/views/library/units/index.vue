<route lang="json5">
{ meta: { title: "Units", order: 1, transition: { name: "slide-left" }, offine: true } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="flex-col fullheight">
                <UnitListComponent @unit-selected="onUnitSelected" />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
/**
 * Similar to online unit browser, but automated
 * https://www.beyondallreason.info/units/armada-bots
 */
import { useRouter } from "vue-router";

import { Unit } from "@main/content/game/unit";
import Panel from "@renderer/components/common/Panel.vue";
import UnitListComponent from "@renderer/components/units/UnitListComponent.vue";

const router = useRouter();

async function onUnitSelected(unit: Unit) {
    await router.push(`/library/units/${unit.unitId}`);
}
</script>

<style lang="scss" scoped></style>
