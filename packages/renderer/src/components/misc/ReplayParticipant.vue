<template>
    <div class="contender" :class="{ color: Boolean(color) }">
        <Flag v-if="'countryCode' in contender" class="flag" :countryCode="contender.countryCode" />
        <Icon v-if="'aiId' in contender" :icon="robot" :height="16" />
        <div>{{ contender.name }}</div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import { DemoModel } from "sdfz-demo-parser";
import { computed } from "vue";

import Flag from "@/components/misc/Flag.vue";

const props = defineProps<{
    contender: DemoModel.Info.Player | DemoModel.Info.AI | DemoModel.Info.Spectator;
}>();

const color = computed(() => {
    if ("rgbColor" in props.contender) {
        return `rgb(${props.contender.rgbColor.r}, ${props.contender.rgbColor.g}, ${props.contender.rgbColor.b})`;
    }
    return null;
});
</script>

<style lang="scss" scoped>
.contender {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.3);
    font-size: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    &.color {
        padding-left: 10px;
        &:before {
            @extend .fullsize;
            left: 0;
            top: 0;
            width: 4px;
            background: v-bind(color);
        }
    }
}
.flag {
    width: 16px;
}
</style>
