<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Credits", hide: true, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col fullheight">
        <div class="view-title flex-row gap-md flex-center-items">
            <Button @click="router.push(`/play/campaigns/${source}/${rootId}/${id}`)">{{ t("lobby.singleplayer.content.back") }}</Button>
            <h1>{{ t("lobby.singleplayer.content.credits") }}</h1>
        </div>
        <Panel class="flex-grow">
            <p v-if="singleplayerStore.content && !campaign">{{ t("lobby.singleplayer.content.notFound") }}</p>
            <div v-if="campaign" class="scroll-container">
                <CreditsList :credits="campaign.credits" />
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import CreditsList from "@renderer/components/singleplayer/CreditsList.vue";
import { useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic } from "@renderer/logic/singleplayer";
import { singleplayerStore } from "@renderer/store/singleplayer.store";
import { type ContentSource, isSameItem } from "@shared/content/singleplayer";

const { source, rootId, id } = defineProps<{
    source: string;
    rootId: string;
    id: string;
}>();

const { t } = useTypedI18n();
const router = useRouter();

const campaign = computed(() =>
    singleplayerStore.content?.campaigns.find((campaign) => isSameItem(campaign, { source: source as ContentSource, rootId, id }))
);

onMounted(() => {
    if (!singleplayerStore.content) {
        singleplayerLogic.loadContent();
    }
});
</script>
