<route lang="json">{ "meta": { "title": "Custom", "order": 2, "transition": { "name": "slide-left" } } }</route>

<template>
    <div>
        <h1>Multiplayer Custom Battles</h1>
        <div class="flex-row flex-wrap gap-md">
            <BattlePreview v-for="battle in battles" :key="battle.id" :battle="battle" />
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * Classic server browser, maybe grid or list view options
 * Preview pane to show players in the battle and additional info
 * Host custom battle button (should request spawning a dedicated instance instead of being self-hosted)
 * Host battle modal that includes options such as public/passworded/friends-only/invite-only, title, map, mode etc
 * Uses TS but hidden, same as casual matchmaking
 */

import { onMounted, ref } from "vue";
import BattlePreview from "@/components/battle/BattlePreview.vue";
import { BattlePreviewType } from "@/model/battle/battle-preview";

const battles = ref([] as BattlePreviewType[]);

onMounted(async () => {
    updateBattleList();
});

async function updateBattleList() {
    const battlesResponse = await api.client.request("c.lobby.query", { query: {} });
    battles.value = battlesResponse.lobbies;
}
</script>