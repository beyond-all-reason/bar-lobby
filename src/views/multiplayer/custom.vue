<route lang="json">{ "meta": { "title": "Custom", "order": 2, "transition": { "name": "slide-left" } } }</route>

<template>
    <div>
        <h1>Multiplayer Custom Battles</h1>
        <div :class="`battle-list battle-list--${layout}`">
            <div v-if="layout === 'rows'" class="battle-list__item battle-list__filters">
                <div />
                <div />
                <div>Name</div>
                <div>Preset</div>
                <div>Map</div>
                <div>Players</div>
                <div>Runtime</div>
            </div>
            <div class="battle-list__items">
                <BattlePreview v-for="battle in battles" :key="battle.id" :battle="battle" :layout="layout === 'tiles' ? 'tile' : 'row'" />
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

import { onMounted, Ref, ref } from "vue";
import BattlePreview from "@/components/battle/BattlePreview.vue";
import { BattlePreviewType } from "@/model/battle/battle-preview";

const battles = ref([] as BattlePreviewType[]);
const layout: Ref<"tiles" | "rows"> = ref("tiles");

onMounted(async () => {
    updateBattleList();
});

async function updateBattleList() {
    const { lobbies } = await api.client.request("c.lobby.query", { query: {} });

    const userIds: number[] = [];
    for (const battle of lobbies) {
        userIds.push(...battle.players);
        userIds.push(battle.founder_id);
    }

    await updateUsers(userIds);

    battles.value = lobbies.map(lobby => {
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
            botNames: Object.values(lobby.bots).map(bot => bot.name),
            passworded: Boolean(lobby.password),
            startTime: lobby.started_at ? new Date(lobby.started_at * 1000) : null
        };
        return battlePreview;
    }).sort((a, b) => {
        return b.userIds.length - a.userIds.length;
    });

    console.log(battles.value);
}

async function updateUsers(userIds: number[]) {
    const { clients, users } = await api.client.request("c.user.list_users_from_ids", { id_list: userIds, include_clients: true });

    for (const user of users) {
        api.session.setUser({
            userId: user.id,
            legacyId: parseInt(user.springid.toString()) || null,
            username: user.name,
            clanId: user.clan_id,
            isBot: user.bot,
            icons: {},
            countryCode: user.country
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
            playerId: client.team_number
        };
    }
}
</script>

<style lang="scss" scoped>
.battle-list {
    $border: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
    &__filters {
        & > div:hover {
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 -1px 0 0 rgba(255, 255, 255, 0.2), 1px 0 0 0 rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.2);
            &:last-child {
                box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 -1px 0 0 rgba(255, 255, 255, 0.2);
            }
        }
    }
    &--tiles {
        .battle-list {
            &__items {
                display: grid;
                grid-gap: 20px;
                grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
            }

        }
    }
    &--rows {
        background: rgba(0, 0, 0, 0.3);
        &:before {
            content: "This view is WIP";
        }
        .battle-list {
            &__item {
                display: grid;
                grid-template-columns: 40px 28px 2fr 60px 2fr 168px 75px;
                border-top: $border;
                background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
                &:last-child {
                    border-bottom: $border;
                }
                &:not(.battle-list__filters):hover {
                    background: rgba(255, 255, 255, 0.2);
                    box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.2);
                }
                & > div {
                    display: block;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    padding: 5px;
                    border-left: $border;
                    &:last-child {
                        border-right: $border;
                    }
                }
            }
        }
    }
}
</style>