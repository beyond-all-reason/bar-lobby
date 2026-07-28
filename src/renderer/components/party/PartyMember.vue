<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<template>
    <div class="party-member">
        <div class="flex-row">
            <span class="margin-right-md">{{ user?.username ?? userId }}</span>
            <Button @click="kickUser" class="red" v-tooltip.left="t('lobby.views.party.kickMember')"><Icon :icon="accountOff" /></Button>
            <Button v-if="user" @click="reportUser" class="margin-left-sm" v-tooltip.left="t('lobby.components.user.reportUser.menuLabel')">
                <ReportUserIcon />
            </Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { party } from "@renderer/store/party.store";
import { db } from "@renderer/store/db";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import accountOff from "@iconify-icons/mdi/account-off";
import ReportUserIcon from "@renderer/components/user/ReportUserIcon.vue";
import { useTypedI18n } from "@renderer/i18n";
import { useReportUser } from "@renderer/composables/useReportUser";

const { t } = useTypedI18n();
const { openReportUser } = useReportUser();

const props = defineProps<{
    userId: string;
}>();

const user = await db.users.get(props.userId);

function reportUser() {
    if (!user) return;

    openReportUser(user);
}

function kickUser() {
    const data = { userId: props.userId };
    party.requestKickMember(data);
}
</script>

<style lang="scss" scoped>
.party-member {
    padding: 10px;
    font-size: 24px;
}
</style>
