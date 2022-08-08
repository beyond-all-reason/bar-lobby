<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>Multiplayer Custom Battles</h1>

        <div class="battle-list">
            <div class="toolbar">
                <Checkbox v-model="hidePvE" label="Hide PvE" />

                <Checkbox v-model="hideLocked" label="Hide Locked" />

                <Options v-model="layout" class="flex-right" required>
                    <Option :value="'tiles'">
                        <Icon :icon="viewGrid" height="30" />
                    </Option>
                    <Option :value="'rows'">
                        <Icon :icon="viewList" height="30" />
                    </Option>
                </Options>
            </div>

            <div :class="`battles ${layout}`">
                <div v-if="layout === 'rows'" class="filters row">
                    <div />
                    <div />
                    <div>Name</div>
                    <div>Preset</div>
                    <div>Map</div>
                    <div>Players</div>
                    <div>Runtime</div>
                </div>
                <BattlePreview v-for="battle in filteredBattles" :key="battle.battleOptions.id" :battle="battle" :layout="layout === 'tiles' ? 'tile' : 'row'" />
            </div>
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

import { Icon } from "@iconify/vue";
import viewGrid from "@iconify-icons/mdi/view-grid";
import viewList from "@iconify-icons/mdi/view-list";
import { arrayToMap } from "jaz-ts-utils";
import { computed, onMounted, onUnmounted, Ref, ref } from "vue";

import BattlePreview from "@/components/battle/BattlePreview.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Option from "@/components/inputs/Option.vue";
import Options from "@/components/inputs/Options.vue";
import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";

const battles = api.session.battles;
const layout: Ref<"tiles" | "rows"> = ref("tiles");
const hidePvE = ref(false);
const hideLocked = ref(false);
const filteredBattles = computed(() =>
    Array.from(battles.values()).filter((battle) => {
        if (hidePvE.value && battle.bots.length > 0) {
            return false;
        }
        if (hideLocked.value && (battle.battleOptions.locked || battle.battleOptions.passworded)) {
            return false;
        }
        return true;
    })
);

let queryIntervalId: number | undefined;

onMounted(async () => {
    updateBattleList();

    queryIntervalId = window.setInterval(() => updateBattleList(), 5000);
});

onUnmounted(() => {
    window.clearInterval(queryIntervalId);
});

async function updateBattleList() {
    const { lobbies } = await api.comms.request("c.lobby.query", { query: {}, fields: ["lobby", "bots", "modoptions", "member_list"] });

    const userIds: number[] = [];
    for (const battle of lobbies.map((data) => data.lobby)) {
        userIds.push(...battle.players);
        userIds.push(battle.founder_id);
    }

    await updateUsers(userIds);

    for (const lobby of lobbies) {
        let battle = api.session.getBattleById(lobby.lobby.id);
        if (!battle) {
            battle = new TachyonSpadsBattle(lobby);
            api.session.battles.set(battle.battleOptions.id, battle);
        } else {
            battle.handleServerResponse(lobby);
        }
    }
}

async function updateUsers(userIds: number[]) {
    const { clients, users } = await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    const clientMap = arrayToMap(clients, "userid");

    for (const user of users) {
        const battleStatus = clientMap.get(user.id);

        if (!battleStatus) {
            console.warn(`Battle status could not be found for user with id ${user.id}`);
            continue;
        }

        api.session.setUser({
            userId: user.id,
            legacyId: parseInt(user.springid.toString()) || null,
            username: user.name,
            clanId: user.clan_id,
            isBot: user.bot,
            icons: {},
            countryCode: user.country,
            battleStatus: {
                away: battleStatus.away,
                inBattle: battleStatus.in_game,
                battleId: battleStatus.lobby_id,
                ready: battleStatus.ready,
                isSpectator: !battleStatus.player,
                color: battleStatus.team_colour,
                teamId: battleStatus.team_number,
                playerId: battleStatus.team_number,
                sync: battleStatus.sync,
            },
        });
    }
}
</script>

<style lang="scss" scoped>
.battle-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 10px;
}
.toolbar {
    display: flex;
    flex-direction: row;
    gap: 10px;
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
    &.tiles {
        display: grid;
        grid-gap: 20px;
        grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    }
    &.rows {
        background: rgba(0 0 0 / 0.3);
    }
}
</style>
