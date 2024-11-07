<route lang="json5">
{ meta: { title: "Units", order: 1, transition: { name: "slide-left" }, offine: true } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="flex-col fullheight">
                <h1>{{ route.meta.title }}</h1>
                <UnitListComponent :units="units.slice(5)" @unit-selected="onUnitSelected" />
                <Markdown
                    source="
- Similar to online unit browser, but automated
- Searchable
- Sortable
- Filterable
- Paginated
"
                />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

import { Unit } from "@main/content/game/unit";
import Panel from "@renderer/components/common/Panel.vue";
import Markdown from "@renderer/components/misc/Markdown.vue";
import UnitListComponent from "@renderer/components/units/UnitListComponent.vue";

const router = useRouter();
const route = router.currentRoute.value;

const units = await window.game.getUnits();

async function onUnitSelected(unit: Unit) {
    await router.push(`/library/units/${unit.unitId}`);
}
</script>

<style lang="scss" scoped></style>
