<route lang="json5">
{ props: true, meta: { title: "Unit Details", hide: true, transition: { name: "slide-left" }, offine: true } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div v-if="unit" class="flex-col fullheight">
                <div class="gap-md">
                    <Button @click="onBack"><Icon :icon="arrowBack" /></Button>
                    <h1>{{ unit.unitName }}</h1>
                    <div>{{ unit.unitId }}</div>
                </div>
                <UnitComponent :unit="unit" />
            </div>
            <div v-else-if="isLoading">Loading...</div>
            <div v-else class="flex-col gap-md">
                <div>
                    <Button @click="onBack"><Icon :icon="arrowBack" /></Button>
                    Unit <strong>{{ props.id }}</strong> does not have information at this time.
                </div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import arrowBack from "@iconify-icons/mdi/arrow-back";

import { db } from "@renderer/store/db";
import Panel from "@renderer/components/common/Panel.vue";
import UnitComponent from "@renderer/components/units/UnitComponent.vue";
import Button from "@renderer/components/controls/Button.vue";
import { ref, watch } from "vue";
import { Unit } from "@main/content/game/unit";
import { initUnitsStore } from "@renderer/store/units.store";

const props = defineProps<{
    id: string;
}>();

const router = useRouter();
const route = useRoute("/library/units/[id]");

initUnitsStore();

const unit = ref<Unit>();
const isLoading = ref(true);
watch(
    () => route.params.id,
    async (unitId) => {
        if (unitId) unit.value = await db.units.get(unitId);
        isLoading.value = false;
    },
    { immediate: true }
);

function onBack() {
    router.go(-1);
}
</script>

<style lang="scss" scoped></style>
