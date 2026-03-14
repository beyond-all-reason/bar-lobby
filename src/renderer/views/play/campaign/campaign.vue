<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Campaign", order: 2, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="margin-lg">
            <h1>{{ route.meta.title }}</h1>
            <div class="fullsize">
                <div class="fullsize">
                    <div class="flex-grow">
                        <Panel>
                            <Button disabled>Load Campaign</Button>
                        </Panel>
                        <div v-for="[campaignId, campaign] in campaignStore.campaignsList" :key="campaignId">
                            <Panel :no-padding="true">
                                <div class="background_image" :style="{ 'background-image': `url('${campaign.backgroundImage}')` }">
                                    <div class="flex-row padding-md">
                                        <div class="flex-start flex-grow">
                                            <h2>
                                                <span><img :src="campaign.logo ? campaign.logo : undefined" />{{ campaign.title }}</span>
                                            </h2>
                                            <p>{{ campaign.description }}</p>
                                        </div>
                                        <div class="flex-end">
                                            <Button
                                                :disabled="!campaign.unlocked"
                                                @click="router.push(`/play/campaign/${campaignId}`)"
                                                :class="campaign.unlocked ? 'green' : 'red'"
                                                ><h1>Open Campaign</h1>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        </div>
                        <Panel>
                            <Button v-if="settingsStore.devMode" disabled>Mission Configurator</Button>
                        </Panel>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Button from "@renderer/components/controls/Button.vue";
import { settingsStore } from "@renderer/store/settings.store";
import { campaignStore } from "@renderer/store/campaign.store";
import Panel from "@renderer/components/common/Panel.vue";

const router = useRouter();
const route = router.currentRoute.value;
</script>

<style lang="scss" scoped>
.background_image {
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
}
</style>
