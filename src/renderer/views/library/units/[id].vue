<route lang="json5">
{ props: true, meta: { title: "Unit Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div v-if="unit" class="gap-md page">
                <h1>{{ unit.unitId }}</h1>
            </div>
            <div v-else class="flex-col gap-md">
                <div>
                    Unit <strong>{{ props.id }}</strong> is not installed.
                </div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
/*
 * TODO:
 * Unit preview
 * - Image
 * - 3D model
 * - Unit resources
 * - Descriptions
 * Back button to return to unit list
 */

import { ref, watch } from "vue";

import { useRouter } from "vue-router";
import { Unit } from "@main/content/game/unit";
import { db } from "@renderer/store/db";

const router = useRouter();

const props = defineProps<{
    id: string;
}>();

const unit = ref<Unit>();
watch(
    () => props.id,
    async () => {
        unit.value = await db.units.get(props.id);
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
.view {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    overflow: hidden;
}

.page {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
}

.container {
    display: flex;
    flex-direction: row;
    gap: 15px;
    height: 100%;
}

.unit-preview-container {
    height: 100%;
    aspect-ratio: 1;
}

.details {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
</style>
