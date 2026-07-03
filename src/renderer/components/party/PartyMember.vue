<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<template>
    <div class="party-member">
        <div class="flex-row">
            <span class="margin-right-md">{{ user?.username ?? userId }}</span>
            <Button @click="kickUser" class="red" v-tooltip.left="t('lobby.views.party.kickMember')"><Icon :icon="accountOff" /></Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { party } from "@renderer/store/party.store";
import { db } from "@renderer/store/db";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import accountOff from "@iconify-icons/mdi/account-off";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

const props = defineProps<{
    userId: string;
}>();

const user = await db.users.get(props.userId);

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
