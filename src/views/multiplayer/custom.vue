<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>Multiplayer Custom Battles</h1>

        <div class="battle-list">
            <div class="flex-row gap-md">
                <Button class="blue" @click="hostBattleOpen = true">Host Battle</Button>
                <HostBattle v-model="hostBattleOpen" />
                <Checkbox v-model="hidePvE" label="Hide PvE" />
                <Checkbox v-model="hideLocked" label="Hide Locked" />
                <Checkbox v-model="hideEmpty" label="Hide Empty" />
            </div>

            <div class="battles">
                <BattlePreview v-for="battle in filteredBattles" :key="battle.battleOptions.id" :battle="battle" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * - Filters
 * - Host custom battle button (should request spawning a dedicated instance instead of being self-hosted)
 * - Host battle modal that includes options such as public/passworded/friends-only/invite-only, title, map, mode etc
 */

import { useIntervalFn } from "@vueuse/shared";
import { delay } from "jaz-ts-utils";
import { computed, ref } from "vue";

import BattlePreview from "@/components/battle/BattlePreview.vue";
import HostBattle from "@/components/battle/HostBattle.vue";
import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import { SpadsBattle } from "@/model/battle/spads-battle";

const hostBattleOpen = ref(false);
const hidePvE = ref(false);
const hideLocked = ref(false);
const hideEmpty = ref(true);
const filteredBattles = computed(() => {
    let battles = Array.from(api.session.battles.values());

    battles = battles.filter((battle) => {
        if (hidePvE.value && battle.bots.length > 0) {
            return false;
        }
        if (hideLocked.value && (battle.battleOptions.locked || battle.battleOptions.passworded)) {
            return false;
        }
        if (hideEmpty.value && battle.users.length === 0) {
            return false;
        }
        return true;
    });

    battles = battles.sort((a, b) => {
        if ((a.battleOptions.locked || a.battleOptions.passworded) && !b.battleOptions.locked && !b.battleOptions.passworded) {
            return 1;
        } else if (!a.battleOptions.locked && !a.battleOptions.passworded && (b.battleOptions.locked || b.battleOptions.passworded)) {
            return -1;
        } else {
            return b.users.length - a.users.length;
        }
    });

    return battles;
});

const updateBattleList = async () => {
    // this prevents polling for updates if the user isn't looking at the battle list
    // commented out for now because the host battle functionality also depends on this to know when the battle is created
    // if (document.visibilityState === "hidden") {
    //     return;
    // }

    const { lobbies } = await api.comms.request("c.lobby.query", { query: {}, fields: ["lobby", "bots", "modoptions", "member_list"] });

    const userIds: number[] = [];
    for (const battle of lobbies.map((data) => data.lobby)) {
        userIds.push(...battle.players);
        userIds.push(battle.founder_id);
    }

    await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    for (const lobby of lobbies) {
        let battle = api.session.battles.get(lobby.lobby.id);
        if (!battle) {
            api.session.battles.set(lobby.lobby.id, new SpadsBattle(lobby));
        } else {
            battle.handleServerResponse(lobby);
        }
    }

    await delay(100); // fixes a weird bug when switching from battle page to this page
};

await updateBattleList();

const queryInterval = useIntervalFn(() => updateBattleList(), 5000);
</script>

<style lang="scss" scoped>
:global(.view--multiplayer-custom > .panel > .content) {
    overflow-y: scroll;
}
.battle-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 15px;
}
.filters {
    & > div {
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0%, rgba(0 0 0 / 0.3) 100%);
        &:hover {
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, rgba(0 0 0 / 0.2) 100%);
        }
    }
}
:deep(.row) {
    display: grid;
    grid-template-columns: 40px 28px 2fr 70px 2fr 170px 90px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
    &:last-child {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    &:not(.filters):hover {
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.2);
    }
    & > div {
        display: block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding: 6px 10px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        &:last-child {
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
    }
}
.battles {
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
}
</style>
