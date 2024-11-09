<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-row gap-md flex-space-between">
            <div class="left flex-row gap-md">
                <Options v-model="factionOption" :options="factionOptions" dataKey="value" label="Faction" :unselectable="false">
                    <template #option="slotProps">
                        <div class="flex-row flex-center-items" :class="slotProps.option.value">
                            <img :src="factionIconsByKey[slotProps.option.value]" height="40px" />
                            {{ slotProps.option.name }}
                        </div>
                    </template>
                </Options>
                <Options v-model="categoryOption" :options="categoryOptions" :unselectable="false"></Options>
            </div>
            <div class="right flex-row gap-md">
                <SearchBox v-model="searchVal" />
                <Options v-model="viewOption" :options="viewOptions" :unselectable="false">
                    <template #option="slotProps">
                        <div class="flex-row flex-center-items gap-md">
                            <Icon :icon="slotProps.option === 'list' ? listIcon : gridIcon" height="23" />{{ slotProps.option }}
                        </div>
                    </template>
                </Options>
            </div>
        </div>

        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container" style="overflow-y: scroll">
                <div class="units" :class="{ list: viewOption === 'list' }">
                    <UnitTile v-for="unit in units" :key="unit.unitId" :unit="unit" :view="viewOption" @click="unitSelected(unit)" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import { FactionKey, Unit } from "@main/content/game/unit";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { db } from "@renderer/store/db";
import Options from "@renderer/components/controls/Options.vue";
import UnitTile from "@renderer/components/units/UnitTile.vue";
import { factionIcons } from "@renderer/assets/assetFiles";
import { Icon } from "@iconify/vue";
import listIcon from "@iconify-icons/mdi/format-list-text";
import gridIcon from "@iconify-icons/mdi/view-grid-compact";

const factionIconsByKey: Record<string, string> = Object.entries(factionIcons).reduce((lookup, [filePath, url]) => {
    const fileName = filePath.split("/").pop().split(".")[0];
    return { ...lookup, [fileName]: url };
}, {});

const viewOption: Ref<"list" | "grid"> = ref("grid");
const viewOptions = ref(["list", "grid"]);

const factionOption: Ref<{ name: string; value: FactionKey }> = ref({ name: "Armada", value: "arm" });
const factionOptions = ref([
    { name: "Armada", value: "arm" },
    { name: "Cortex", value: "cor" },
]);

const categoryOption = ref("bots");
const categoryOptions = ref(["bots", "vehicles", "air", "sea", "hover", "factories", "defense", "buildings"]);

const searchVal = ref("");

const units = useDexieLiveQueryWithDeps(
    [searchVal, factionOption, categoryOption],
    ([newSearchVal, newFactionOption, newCategoryOption]) =>
        db.units
            .where("factionKey")
            .equals(newFactionOption.value)
            .filter(
                (unit) =>
                    unit.unitCategory == newCategoryOption &&
                    (unit.unitId.toLocaleLowerCase().includes(newSearchVal.toLocaleLowerCase()) ||
                        unit.unitName?.toLocaleLowerCase().includes(newSearchVal.toLocaleLowerCase()) ||
                        unit.unitDescription?.toLocaleLowerCase().includes(newSearchVal.toLocaleLowerCase()))
            )
            .sortBy("techLevel"),
    { initialValue: [] }
);

const emit = defineEmits<{
    (event: "unit-selected", unit: Unit): void;
}>();
function unitSelected(unit: Unit) {
    emit("unit-selected", unit);
}
</script>

<style lang="scss" scoped>
.units {
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    padding-right: 10px;
}

.units.list {
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
}
</style>
