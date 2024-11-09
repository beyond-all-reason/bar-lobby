<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-col gap-md flex-grow fullheight">
            <div class="scroll-container" style="overflow-y: scroll">
                <div class="units flex-row">
                    <UnitImage :unit="unit" />
                    <UnitStats :unit="unit" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/*
 * TODO:
 * - 3D model
 * - More unit resources
 * - Descriptions
 * - Related units
 * - Buildable units
 */

import { Unit } from "@main/content/game/unit";
import UnitImage from "@renderer/components/units/UnitImage.vue";
import UnitStats from "@renderer/components/units/UnitStats.vue";

defineProps<{ unit: Unit }>();
</script>

<style lang="scss" scoped></style>
