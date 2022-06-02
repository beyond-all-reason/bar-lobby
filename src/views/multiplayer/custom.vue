<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>Multiplayer Custom Battles</h1>

        <div class="battle-list gap-md">
            <div class="toolbar gap-md">
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
                <BattlePreview v-for="battle in filteredBattles" :key="battle.id" :battle="battle" :layout="layout === 'tiles' ? 'tile' : 'row'" />
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
import { computed, onMounted, Ref, ref } from "vue";

import BattlePreview from "@/components/battle/BattlePreview.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Option from "@/components/inputs/Option.vue";
import Options from "@/components/inputs/Options.vue";
import { BattlePreviewType } from "@/model/battle/battle-preview";

const battles = ref([] as BattlePreviewType[]);
const layout: Ref<"tiles" | "rows"> = ref("tiles");
const hidePvE = ref(false);
const hideLocked = ref(false);
const filteredBattles = computed(() =>
    battles.value.filter((battle) => {
        if (hidePvE.value && battle.botNames.length > 0) {
            return false;
        }
        if (hideLocked.value && (battle.locked || battle.passworded)) {
            return false;
        }
        return true;
    })
);

onMounted(async () => {
    updateBattleList();
});

async function updateBattleList() {
    const { lobbies } = await api.comms.request("c.lobby.query", { query: {} });

    const userIds: number[] = [];
    for (const battle of lobbies) {
        userIds.push(...battle.players);
        userIds.push(battle.founder_id);
    }

    await updateUsers(userIds);

    battles.value = lobbies
        .map((lobby) => {
            const battlePreview: BattlePreviewType = {
                id: lobby.id,
                title: lobby.name,
                engineVersion: lobby.engine_version,
                founderId: lobby.founder_id,
                locked: lobby.locked,
                mapName: lobby.map_name,
                maxPlayers: lobby.max_players,
                type: lobby.type,
                userIds: lobby.players,
                botNames: Object.values(lobby.bots).map((bot) => bot.name),
                passworded: Boolean(lobby.password),
                startTime: lobby.started_at ? new Date(lobby.started_at * 1000) : null,
            };
            return battlePreview;
        })
        .sort((a, b) => {
            return b.userIds.length - a.userIds.length;
        });
}

async function updateUsers(userIds: number[]) {
    const { clients, users } = await api.comms.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    for (const user of users) {
        api.session.setUser({
            userId: user.id,
            legacyId: parseInt(user.springid.toString()) || null,
            username: user.name,
            clanId: user.clan_id,
            isBot: user.bot,
            icons: {},
            countryCode: user.country,
        });
    }

    for (const client of clients) {
        api.session.getUserById(client.userid)!.battleStatus = {
            away: client.away,
            inGame: client.in_game,
            battleId: client.lobby_id,
            ready: client.ready,
            spectator: !client.player,
            color: client.team_colour,
            teamId: client.team_number,
            playerId: client.team_number,
        };
    }
}
</script>

<style lang="scss" scoped>
.battle-list {
    width: 100%;
}
.toolbar {
    flex-direction: row;
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
