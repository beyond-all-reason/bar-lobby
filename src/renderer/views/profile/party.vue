<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Party", hide: true, transition: { name: "slide-left" } } }
</route>
<template>
    <div class="view">
        <Panel class="profile-container" v-if="partyStore.activeParty || true">
            <div class="profile-header">Party Time!</div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
//import { useTypedI18n } from "@renderer/i18n";
import { partyStore } from "@renderer/store/party.store";
//const { t } = useTypedI18n();
</script>

<style lang="scss" scoped>
.profile-container {
    display: flex;
    height: 100%;
    width: 1600px;
    align-self: center;
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    margin-top: 25px;
    div {
        margin-right: auto;
    }
}

.avatar {
    width: 184px;
    height: 184px;
    border-radius: 1%;
    margin-right: 20px;
    border: 1px solid #5e5757;
    backdrop-filter: blur(2px);
}

.profile-user-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
}
</style>
