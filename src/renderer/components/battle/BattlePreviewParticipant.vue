<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="contender" :class="{ color: Boolean(color) }" @contextmenu="onRightClick">
        <Flag v-if="'countryCode' in contender" class="flag" :countryCode="contender.countryCode" />
        <Icon v-if="'aiId' in contender" :icon="robot" :height="16" />
        <div>{{ name }}</div>
        <ContextMenu ref="menu" :model="actions" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import { computed, ref } from "vue";
import Flag from "@renderer/components/misc/Flag.vue";
import ContextMenu from "@renderer/components/common/ContextMenu.vue";
import { reportUserIconClass, useReportUser } from "@renderer/composables/useReportUser";
import { useTypedI18n } from "@renderer/i18n";
import { db } from "@renderer/store/db";

const props = defineProps<{
    contender: { name: string; rgbColor?: { r: number; g: number; b: number }; countryCode?: string; aiId?: number };
}>();

const { t } = useTypedI18n();
const { openReportUser } = useReportUser();

const menu = ref<InstanceType<typeof ContextMenu>>();
const actions = ref<{ label: string; icon: string; command: () => void }[]>([]);

// Replays name their players but carry no user id, so reporting is only offered for someone this
// client has already seen online.
async function onRightClick(event: MouseEvent) {
    if ("aiId" in props.contender) return;

    event.preventDefault();

    const user = await db.users.where("username").equals(props.contender.name).first();
    if (!user) return;

    actions.value = [
        {
            label: t("lobby.components.user.reportUser.menuLabel"),
            icon: reportUserIconClass,
            command: () => openReportUser(user),
        },
    ];

    menu.value?.show(event);
}

const name = computed(() => props.contender.name);

const color = computed(() => {
    if ("rgbColor" in props.contender) {
        return `rgb(${props.contender.rgbColor?.r}, ${props.contender.rgbColor?.g}, ${props.contender.rgbColor?.b})`;
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
