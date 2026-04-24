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
        <div class="mission-list">
            <div v-for="[missionId, mission] in Object.entries(campaign?.missions ?? {})" :key="missionId" class="mission-card">
                <Panel :no-padding="true">
                    <div
                        class="background_image"
                        :style="{
                            'background-image': mission.image ? `url('bar://${encodeURIComponent(mission.image)}')` : undefined,
                        }"
                    >
                        <div class="flex-row padding-md">
                            <div class="flex-start flex-grow">
                                <h2>{{ mission.title }}</h2>
                            </div>
                            <div class="flex-end">
                                <Button
                                    :disabled="!mission.unlocked"
                                    @click="mission.unlocked && router.push(`/play/campaign/${campaignId}/${missionId}`)"
                                    :class="mission.unlocked ? 'green' : 'red'"
                                >
                                    <h1>{{ mission.unlocked ? "Play" : "Locked" }}</h1>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import arrow_back from "@iconify-icons/mdi/arrow-back";
import Panel from "@renderer/components/common/Panel.vue";
import { useCampaignLoader } from "@renderer/composables/useCampaignLoader";

const router = useRouter();

const props = defineProps<{
    campaignId: string;
}>();

const { getCampaign, ensureLoaded } = useCampaignLoader();
await ensureLoaded();

const campaign = computed(() => getCampaign(props.campaignId));

function goBack() {
    router.back();
}
</script>

<style lang="scss" scoped>
// Override the global .view padding-bottom (140px) so the list fills all available space.
.view {
    padding-bottom: 15px;
}

.mission-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: auto;
    height: 0px;
}

.background_image {
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
}
</style>
