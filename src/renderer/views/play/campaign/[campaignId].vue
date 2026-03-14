<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Campaign Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view margin-lg">
        <div class="gridform">
            <div class="flex-right">
                <Button v-tooltip.bottom="'Back'" class="icon close flex-right" @click="goBack">
                    <Icon :icon="arrow_back" :height="40" />
                </Button>
            </div>
            <h1>{{ campaign?.title }}</h1>
        </div>
        <p>{{ campaign?.description }}</p>
        <div v-for="[missionId, mission] in campaign?.missions" :key="missionId">
            <Button @click="router.push(`/play/campaign/${campaignId}-${missionId}`)" :disabled="!mission.unlocked"
                ><h2>{{ mission.title }}</h2></Button
            >
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import { campaignStore } from "@renderer/store/campaign.store";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import arrow_back from "@iconify-icons/mdi/arrow-back";

const router = useRouter();

const props = defineProps<{
    campaignId: string;
}>();
const campaign = campaignStore.campaignsList.get(props.campaignId);

function goBack() {
    router.back();
}
</script>

<style></style>
