<template>
    <div class="contender" :class="{ color: Boolean(color) }">
        <Flag v-if="typeof contender === 'object' && 'countryCode' in contender" class="flag" :countryCode="contender.countryCode" />
        <Icon v-if="typeof contender === 'object' && 'aiId' in contender" :icon="robot" :height="16" />
        <div>{{ name }}</div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import { DemoModel } from "sdfz-demo-parser";
import { computed } from "vue";

import Flag from "@/components/misc/Flag.vue";
import { Bot } from "@/model/battle/battle-types";
import { User } from "@/model/user";
import { isUser } from "@/utils/type-checkers";

const props = defineProps<{
    contender: DemoModel.Info.Player | DemoModel.Info.AI | DemoModel.Info.Spectator | User | Bot;
}>();

const name = computed(
    () => (typeof props.contender === "object" && (isUser(props.contender) ? props.contender.username : props.contender?.name)) || "Unknown"
);

const color = computed(() => {
    return typeof props.contender === "object" && "rgbColor" in props.contender
        ? `rgb(${props.contender.rgbColor.r}, ${props.contender.rgbColor.g}, ${props.contender.rgbColor.b})`
        : null;
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
    font-size: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    // &.color { // disabled for now because colors need to be parsed from packet stream (because of colour gadget), and we want to skip packet parsing to speed things up
    //     padding-left: 10px;
    //     &:before {
    //         @extend .fullsize;
    //         left: 0;
    //         top: 0;
    //         width: 4px;
    //         background: v-bind(color);
    //     }
    // }
}
.flag {
    width: 16px;
}
</style>
