<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Campaign", order: 2, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col fullheight">
        <div class="view-title">
            <h1>{{ t("lobby.singleplayer.content.campaigns") }}</h1>
        </div>
        <Panel class="flex-grow">
            <div class="scroll-container">
                <CampaignSelect :official="true" />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import CampaignSelect from "@renderer/components/singleplayer/CampaignSelect.vue";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();
</script>
