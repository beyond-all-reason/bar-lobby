<template>
    <div :class="['battle-container', { singleplayer: true }]">
        <div class="header flex-col gap-md">
            <BattleTitleComponent />
            <!-- <div v-if="isSpadsBattle(battle)" class="subtitle flex-row gap-md flex-wrap">
                <div class="flex-row gap-sm">
                    Hosted by
                    <div class="founder flex-row gap-sm">
                        <Flag :countryCode="battleStore.founder.value.countryCode" style="width: 16px" />
                        {{ battleStore.founder.value.username }}
                    </div>
                </div>
                <div class="flex-right">{{ battleStore.friendlyRuntime.value }}</div>
            </div> -->
        </div>
        <div class="players flex-col gap-md">
            <Playerlist />
        </div>
        <!-- <div v-if="isSpadsBattle(battle)" class="chat flex-col gap-md">
            <BattleChat />
        </div> -->
        <div class="settings flex-col gap-md">
            <!-- <MapPreview
                v-if="map"
                :map="map"
                :startPosType="battleStore.battleOptions.startPosType"
                :startBoxes="battleStore.battleOptions.startBoxes"
            /> -->
            <MapOverviewCard :map="map" friendly-name="" />
            <div class="flex-row gap-md">
                <Select
                    :modelValue="battleStore.battleOptions.mapScriptName"
                    :options="mapListOptions"
                    label="Map"
                    optionLabel="scriptName"
                    optionValue="scriptName"
                    :filter="true"
                    class="fullwidth"
                    :placeholder="battleStore.battleOptions.mapScriptName"
                    @update:model-value="onMapSelected"
                />
                <Button v-tooltip.left="'Open map selector'" @click="openMapList">
                    <Icon :icon="listIcon" height="23" />
                </Button>
                <Button v-tooltip.left="'Configure map options'" @click="openMapOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <MapListModal v-model="mapListOpen" title="Maps" @map-selected="onMapSelected" />
                <MapOptionsModal
                    v-if="map"
                    v-model="mapOptionsOpen"
                    title="Map Options"
                    :map="map"
                    :startBoxes="battleStore.battleOptions.startBoxes"
                    :startPosType="battleStore.battleOptions.startPosType"
                    @set-map-options="setMapOptions"
                />
            </div>
            <div class="flex-row gap-md">
                <Select
                    :modelValue="battleStore.battleOptions.gameVersion"
                    :options="gameListOptions"
                    optionLabel="gameVersion"
                    optionValue="gameVersion"
                    label="Game"
                    :filter="true"
                    :placeholder="battleStore.battleOptions.gameVersion"
                    @update:model-value="onGameSelected"
                />
                <Button v-tooltip.left="'Configure game options'" @click="openGameOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <LuaOptionsModal
                    id="game-options"
                    v-model="gameOptionsOpen"
                    :luaOptions="battleStore.battleOptions.gameOptions"
                    :title="`Game Options - ${battleStore.battleOptions.gameVersion}`"
                    :sections="gameOptions"
                    @set-options="setGameOptions"
                />
            </div>
            <div>
                <Select
                    :modelValue="battleStore.battleOptions.engineVersion"
                    :options="engineListOptions"
                    optionLabel="id"
                    optionValue="id"
                    label="Engine"
                    :filter="true"
                    :placeholder="battleStore.battleOptions.engineVersion"
                    class="fullwidth"
                    @update:model-value="onEngineSelected"
                />
            </div>
            <!-- <template v-if="isSpadsBattle(battle)">
                <div class="flex-row gap-md">
                    <Checkbox label="Locked" :modelValue="battleStore.battleOptions.locked" showButtons @update:model-value="onLockedChanged" />
                    <Select
                        :modelValue="battleStore.battleOptions.preset"
                        :options="['duel', 'team', 'ffa', 'teamffa']"
                        label="Preset"
                        :placeholder="battleStore.battleOptions.preset"
                        class="fullwidth"
                        @update:model-value="onPresetSelected"
                    />
                </div>
                <div class="flex-row gap-md">
                    <Select
                        :modelValue="battleStore.battleOptions.balanceMode"
                        :options="['skill', 'clan;skill', 'random']"
                        label="Balance Mode"
                        :placeholder="battleStore.battleOptions.balanceMode"
                        class="fullwidth"
                        @update:model-value="onBalanceModeSelected"
                    />
                    <Select
                        label="Team Size"
                        :modelValue="battleStore.battleOptions.teamSize"
                        :options="[1, 2, 3, 4, 5, 6, 7, 8]"
                        class="fullwidth"
                        showButtons
                        @update:model-value="onTeamSizeSelected"
                    />
                </div>
                <div class="flex-row gap-md">
                    <Select
                        :modelValue="battleStore.battleOptions.autoBalance"
                        :options="['on', 'off', 'advanced']"
                        label="Auto Balance"
                        :placeholder="battleStore.battleOptions.autoBalance"
                        class="fullwidth"
                        @update:model-value="onAutoBalanceSelected"
                    />
                    <Select
                        label="Num of Teams"
                        :modelValue="battleStore.battleOptions.nbTeams"
                        :options="[2, 3, 4]"
                        class="fullwidth"
                        showButtons
                        @update:model-value="onNbTeamsSelected"
                    />
                </div>
            </template> -->
            <div class="flex-row flex-bottom gap-md">
                <!-- <Button class="red fullwidth" @click="leave">Leave</Button> -->
                <Button class="fullwidth green" :disabled="gameStore.isGameRunning" @click="battleActions.startBattle">Start</Button>
                <!-- <template v-if="isSpadsBattle(battle)">
                    <template v-if="mePlayer.battleStatus.isSpectator">
                        <Button v-if="battleStore.myQueuePosition.value" class="fullwidth red" @click="leaveQueue"
                            >Leave Queue ({{ battleStore.myQueuePosition.value }})</Button
                        >
                        <Button v-else class="fullwidth green" @click="joinQueue"
                            >Join Queue ({{ battleStore.battleOptions.joinQueueUserIds.length + 1 }})</Button
                        >
                        <Button
                            v-if="battleStore.battleOptions.startTime"
                            class="fullwidth green"
                            :disabled="gameStore.isGameRunning"
                            @click="start"
                            >Watch</Button
                        >
                    </template>
                    <template v-else>
                        <Button v-if="mePlayer.battleStatus.ready" class="fullwidth green" @click="toggleReady"
                            ><span class="checkbox">✔</span>Unready</Button
                        >
                        <Button v-else class="fullwidth yellow" @click="toggleReady"><span class="checkbox">✖</span>Ready</Button>
                        <Button
                            v-if="battleStore.battleOptions.startTime"
                            class="fullwidth green"
                            :disabled="gameStore.isGameRunning"
                            @click="start"
                            >Rejoin</Button
                        >
                        <Button v-else class="fullwidth green" :disabled="gameStore.isGameRunning" @click="start">Start</Button>
                    </template>
                </template> -->
            </div>
        </div>
    </div>
    <!-- <Transition name="slide-up">
        <VotingPanel v-if="isSpadsBattle(battle) && battleStore.currentVote.value" :vote="battleStore.currentVote.value" :battle="battle" />
    </Transition> -->
</template>

<script lang="ts" setup>
// TODO: boss, ring, forcespec, kick, ban, preset, votes, rename battle, custom boxes,
// show non-default mod/map options, tweakunits, stop, rejoin, balance mode
import { Ref, ref, watch } from "vue";
import { getBoxes, StartBoxOrientation } from "@renderer/utils/start-boxes";
import { LuaOptionSection } from "@main/content/game/lua-options";
import { StartPosType } from "@main/game/battle/battle-types";
import { gameStore } from "@renderer/store/game.store";
import BattleTitleComponent from "@renderer/components/battle/BattleTitleComponent.vue";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
import Select from "@renderer/components/controls/Select.vue";
import { Icon } from "@iconify/vue";
import MapListModal from "@renderer/components/battle/MapListModal.vue";
import MapOptionsModal from "@renderer/components/battle/MapOptionsModal.vue";
import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import { battleActions, battleStore } from "@renderer/store/battle.store";
import Button from "@renderer/components/controls/Button.vue";
import { MapData } from "@main/content/maps/map-data";
import { db } from "@renderer/store/db";
import MapOverviewCard from "@renderer/components/maps/MapOverviewCard.vue";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import cogIcon from "@iconify-icons/mdi/cog";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";

// onBeforeMount(async () => {
//     const engine = await db.engineVersions.orderBy("id").first();
//     const game = await db.gameVersions.orderBy("gameVersion").first();
//     const map = await db.maps.orderBy("scriptName").first();
//     resetToDefaultBattle(engine, game, map);
// });

const map = ref<MapData>();
watch(
    () => battleStore.battleOptions.mapScriptName,
    async (mapScriptName) => {
        console.log("mapScriptName for this battle", mapScriptName);
        if (!mapScriptName) {
            return;
        }
        map.value = await db.maps.get(mapScriptName);
    }
);

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
const gameOptionsOpen = ref(false);
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());
const engineListOptions = useDexieLiveQuery(() => db.engineVersions.toArray());

const gameOptions: Ref<LuaOptionSection[]> = ref([]);

function openMapList() {
    mapListOpen.value = true;
}
function openMapOptions() {
    mapOptionsOpen.value = true;
}

function onEngineSelected(engineVersion: string) {
    battleStore.battleOptions.engineVersion = engineVersion;
}

function onGameSelected(gameVersion: string) {
    battleStore.battleOptions.gameVersion = gameVersion;
}

async function openGameOptions() {
    // TODO: show loader on button (maybe @clickAsync event?)
    gameOptions.value = await window.game.getGameOptions(battleStore.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setGameOptions(options: Record<string, any>) {
    battleStore.battleOptions.gameOptions = options;
}

function setMapOptions(startPosType: StartPosType, orientation: StartBoxOrientation, size: number) {
    battleStore.battleOptions.startPosType = startPosType;
    battleStore.battleOptions.startBoxes = getBoxes(orientation, size);
}

function onMapSelected(mapScriptName: string) {
    mapListOpen.value = false;
    battleStore.battleOptions.mapScriptName = mapScriptName;
}

function onPresetSelected(preset: string) {
    // api.comms.request("c.lobby.message", {
    //     message: `!cv preset ${preset}`,
    // });
}

function onBalanceModeSelected(balanceMode: string) {
    // api.comms.request("c.lobby.message", {
    //     message: `!cv balanceMode ${balanceMode}`,
    // });
}

function onAutoBalanceSelected(autoBalance: string) {
    // api.comms.request("c.lobby.message", {
    //     message: `!cv autoBalance ${autoBalance}`,
    // });
}

function onNbTeamsSelected(nbTeams: number) {
    // api.comms.request("c.lobby.message", {
    //     message: `!cv nbTeams ${nbTeams}`,
    // });
}

function onTeamSizeSelected(teamSize: number) {
    // api.comms.request("c.lobby.message", {
    //     message: `!cv teamSize ${teamSize}`,
    // });
}

function onLockedChanged(locked: boolean) {
    // api.comms.request("c.lobby.message", {
    //     message: `!${locked ? "lock" : "unlock"}`,
    // });
}

function toggleReady() {
    // api.comms.request("c.lobby.update_status", {
    //     client: {
    //         ready: !props.mePlayer.battleStatus.ready,
    //     },
    // });
}

function joinQueue() {
    // api.comms.request("c.lobby.message", {
    //     message: "$joinq",
    // });
}

function leaveQueue() {
    // api.comms.request("c.lobby.message", {
    //     message: "$leaveq",
    // });
}

function leave() {
    // battleStore.leave();
    // resetToDefaultBattle();
}
</script>

<style lang="scss" scoped>
.battle-container {
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 450px;
    grid-template-rows: auto 1fr;
    gap: 10px;
    grid-template-areas:
        "header header settings"
        "players chat settings";
    &.singleplayer {
        grid-template-areas:
            "header header settings"
            "players players settings";
    }
}
.header {
    grid-area: header;
}
.settings {
    grid-area: settings;
}
.players {
    grid-area: players;
}
.chat {
    grid-area: chat;
}
.title {
    font-size: 30px;
    line-height: 1.2;
}
.edit-title {
    padding: 5px;
    color: rgba(255, 255, 255, 0.5);
    &:hover {
        color: #fff;
    }
}
.subtitle {
    font-size: 16px;
}
.checkbox {
    margin-right: 10px;
}
</style>
