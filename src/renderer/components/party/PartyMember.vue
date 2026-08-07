<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<template>
    <div class="party-member">
        <div class="flex-row">
            <span class="margin-right-md margin-left-md">{{ user?.username ?? userId }}</span>
            <Button v-if="showKickButton" @click="kickUser" class="red" v-tooltip.left="t('lobby.views.party.kickMember')"
                ><Icon :icon="accountOff"
            /></Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { party } from "@renderer/store/party.store";
import { db } from "@renderer/store/db";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import accountOff from "@iconify-icons/mdi/account-off";
import { useTypedI18n } from "@renderer/i18n";
import { me } from "@renderer/store/me.store";

const { t } = useTypedI18n();

const props = defineProps<{
    userId: string;
}>();

const user = await db.users.get(props.userId);

function kickUser() {
    const data = { userId: props.userId };
    party.requestKickMember(data);
}

const showKickButton = computed(() => me.userId !== props.userId);
</script>

<style lang="scss" scoped>
.party-member {
    padding: 10px;
    font-size: 24px;
    outline: solid 1px #ccc;
}
</style>
