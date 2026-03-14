<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Mission Details", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view margin-lg">
        <div class="gridform">
            <div class="flex-right">
                <Button v-tooltip.bottom="'Back'" class="icon close flex-right" @click="goBack">
                    <Icon :icon="arrow_back" :height="40" />
                </Button>
            </div>
            <h1>{{ mission?.title }}</h1>
        </div>
        <p>
            <i>{{ campaign?.title }}</i>
        </p>
        <p>{{ mission?.description }}</p>
        <MapSimplePreview :map="map"></MapSimplePreview>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { campaignStore } from "@renderer/store/campaign.store";
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import arrow_back from "@iconify-icons/mdi/arrow-back";
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";

const router = useRouter();

const props = defineProps<{
    missionId: string;
    campaignId: string;
}>();

const campaign = computed(() => {
    return campaignStore.campaignsList.get(props.campaignId);
});
const mission = computed(() => {
    return campaignStore.campaignsList.get(props.campaignId)?.missions.get(props.missionId);
});

const map = useDexieLiveQueryWithDeps([() => mission.value?.mapName], () =>
    db.maps.get(mission.value?.mapName ? mission.value?.mapName : "")
);

function goBack() {
    router.back();
}
</script>

<style></style>
