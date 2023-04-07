<template>
    <div :class="['battle-container', { singleplayer: isOfflineBattle(battle) }]">
        <div class="header flex-col gap-md">
            <h1 class="title">{{ battle.battleOptions.title }}</h1>

            <div v-if="isSpadsBattle(battle)" class="subtitle flex-row gap-md flex-wrap">
                <div class="flex-row gap-sm">
                    Hosted by
                    <div class="founder flex-row gap-sm">
                        <Flag :countryCode="battle.founder.value.countryCode" style="width: 16px" />
                        {{ battle.founder.value.username }}
                    </div>
                </div>
                <div class="flex-right">{{ battle.friendlyRuntime.value }}</div>
            </div>
        </div>
        <div class="players flex-col gap-md">
            <Playerlist :battle="battle" :me="me" />
        </div>
        <div v-if="isSpadsBattle(battle)" class="chat flex-col gap-md">
            <BattleChat />
        </div>
        <div class="settings flex-col gap-md">
            <MapPreview
                :map="props.battle.battleOptions.map"
                :startPosType="props.battle.battleOptions.startPosType"
                :startBoxes="props.battle.battleOptions.startBoxes"
                :isSpectator="me.battleStatus.isSpectator"
                :myTeamId="me.battleStatus.teamId"
            />

            <div class="flex-row gap-md">
                <Options
                    :modelValue="battle.battleOptions.startPosType"
                    :options="startPosOptions"
                    label="Start Pos"
                    optionLabel="label"
                    optionValue="value"
                    :unselectable="false"
                    class="fullwidth"
                    @update:model-value="onStartPosChange"
                />
                <div class="box-buttons" :class="{ disabled: battle.battleOptions.startPosType === StartPosType.Boxes }">
                    <Button @click="setBoxes(defaultBoxes().EastVsWest)">
                        <img src="~@/assets/images/icons/east-vs-west.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NorthVsSouth)">
                        <img src="~@/assets/images/icons/north-vs-south.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NortheastVsSouthwest)">
                        <img src="~@/assets/images/icons/northeast-vs-southwest.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NorthwestVsSouthEast)">
                        <img src="~@/assets/images/icons/northwest-vs-southeast.png" />
                    </Button>
                </div>
            </div>

            <div class="flex-row gap-md">
                <Select
                    :modelValue="battle.battleOptions.map"
                    :options="installedMaps"
                    label="Map"
                    optionLabel="scriptName"
                    optionValue="scriptName"
                    :filter="true"
                    class="fullwidth"
                    :placeholder="battle.battleOptions.map"
                    @update:model-value="onMapSelected"
                />
                <Button v-tooltip.left="'Open map selector'" @click="openMapList">
                    <Icon :icon="listIcon" height="23" />
                </Button>
                <Button v-tooltip.left="'Configure map options'" @click="openMapOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <MapListModal v-model="mapListOpen" title="Maps" @map-selected="onMapSelected" />
            </div>

            <div class="flex-row gap-md">
                <Select
                    :modelValue="battle.battleOptions.gameVersion"
                    :options="installedGames"
                    label="Game"
                    :filter="true"
                    :placeholder="battle.battleOptions.gameVersion"
                    :disabled="isSpadsBattle(battle)"
                    @update:model-value="onGameSelected"
                />
                <Button v-tooltip.left="'Configure game options'" @click="openGameOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <LuaOptionsModal
                    id="game-options"
                    v-model="gameOptionsOpen"
                    :luaOptions="battle.battleOptions.gameOptions"
                    :title="`Game Options - ${battle.battleOptions.gameVersion}`"
                    :sections="gameOptions"
                    @set-options="setGameOptions"
                />
            </div>

            <Select
                :modelValue="battle.battleOptions.engineVersion"
                :options="installedEngines"
                label="Engine"
                :filter="true"
                :placeholder="battle.battleOptions.engineVersion"
                :disabled="isSpadsBattle(battle)"
                class="fullwidth"
                @update:model-value="onEngineSelected"
            />

            <template v-if="isSpadsBattle(battle)">
                <div class="flex-row gap-md">
                    <Checkbox label="Locked" :modelValue="battle.battleOptions.locked" showButtons @update:model-value="onLockedChanged" />

                    <Select
                        :modelValue="battle.battleOptions.preset"
                        :options="['duel', 'team', 'ffa', 'teamffa']"
                        label="Preset"
                        :placeholder="battle.battleOptions.preset"
                        class="fullwidth"
                        @update:model-value="onPresetSelected"
                    />
                </div>

                <div class="flex-row gap-md">
                    <Select
                        :modelValue="battle.battleOptions.balanceMode"
                        :options="['skill', 'clan;skill', 'random']"
                        label="Balance Mode"
                        :placeholder="battle.battleOptions.balanceMode"
                        class="fullwidth"
                        @update:model-value="onBalanceModeSelected"
                    />

                    <Select
                        label="Team Size"
                        :modelValue="battle.battleOptions.teamSize"
                        :options="[1, 2, 3, 4, 5, 6, 7, 8]"
                        class="fullwidth"
                        showButtons
                        @update:model-value="onTeamSizeSelected"
                    />
                </div>

                <div class="flex-row gap-md">
                    <Select
                        :modelValue="battle.battleOptions.autoBalance"
                        :options="['on', 'off', 'advanced']"
                        label="Auto Balance"
                        :placeholder="battle.battleOptions.autoBalance"
                        class="fullwidth"
                        @update:model-value="onAutoBalanceSelected"
                    />

                    <Select
                        label="Num of Teams"
                        :modelValue="battle.battleOptions.nbTeams"
                        :options="[2, 3, 4]"
                        class="fullwidth"
                        showButtons
                        @update:model-value="onNbTeamsSelected"
                    />
                </div>
            </template>

            <div class="flex-row flex-bottom gap-md">
                <Button class="red fullwidth" @click="leave"> Leave </Button>

                <template v-if="isSpadsBattle(battle)">
                    <template v-if="me.battleStatus.isSpectator">
                        <Button v-if="battle.myQueuePosition.value" class="fullwidth red" @click="leaveQueue"
                            >Leave Queue ({{ battle.myQueuePosition.value }})</Button
                        >
                        <Button v-else class="fullwidth green" @click="joinQueue"
                            >Join Queue ({{ battle.battleOptions.joinQueueUserIds.length + 1 }})</Button
                        >

                        <Button v-if="battle.battleOptions.startTime" class="fullwidth green" :disabled="isGameRunning" @click="start"
                            >Watch</Button
                        >
                    </template>
                    <template v-else>
                        <Button v-if="me.battleStatus.ready" class="fullwidth blue" @click="toggleReady">Unready</Button>
                        <Button v-else class="fullwidth blue" @click="toggleReady">Ready</Button>

                        <Button v-if="battle.battleOptions.startTime" class="fullwidth green" :disabled="isGameRunning" @click="start"
                            >Rejoin</Button
                        >
                        <Button v-else class="fullwidth green" :disabled="isGameRunning" @click="start">Start</Button>
                    </template>
                </template>
                <template v-else-if="isOfflineBattle(battle)">
                    <Button class="fullwidth green" :disabled="isGameRunning" @click="start">Start</Button>
                </template>
            </div>
        </div>
    </div>
    <Transition name="slide-up">
        <VotingPanel v-if="isSpadsBattle(battle) && battle.currentVote.value" :vote="battle.currentVote.value" :battle="battle" />
    </Transition>
</template>

<script lang="ts" setup>
// TODO: boss, ring, forcespec, kick, ban, preset, votes, rename battle, custom boxes,
// show non-default mod/map options, tweakunits, stop, rejoin, balance mode

import { Icon } from "@iconify/vue";
import cogIcon from "@iconify-icons/mdi/cog";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import { computed, Ref, ref } from "vue";

import BattleChat from "@/components/battle/BattleChat.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import MapListModal from "@/components/battle/MapListModal.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import VotingPanel from "@/components/battle/VotePanel.vue";
import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import Options from "@/components/controls/Options.vue";
import Select from "@/components/controls/Select.vue";
import MapPreview from "@/components/maps/MapPreview.vue";
import Flag from "@/components/misc/Flag.vue";
import { defaultBoxes } from "@/config/default-boxes";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { StartBox, StartPosType } from "@/model/battle/battle-types";
import { LuaOptionSection } from "@/model/lua-options";
import { CurrentUser } from "@/model/user";
import { isOfflineBattle, isSpadsBattle } from "@/utils/type-checkers";

const props = defineProps<{
    battle: AbstractBattle;
    me: CurrentUser;
}>();

const installedEngines = computed(() => api.content.engine.installedVersions);
const installedMaps = computed(() =>
    api.content.maps.installedMaps.sort((a, b) => {
        return a.friendlyName.localeCompare(b.friendlyName);
    })
);
const map = computed(() => api.content.maps.getMapByScriptName(props.battle.battleOptions.map));
const installedGames = computed(() => Array.from(api.content.game.installedVersions));
const mapListOpen = ref(false);
const gameOptionsOpen = ref(false);
const gameOptions: Ref<LuaOptionSection[]> = ref([]);
const isGameRunning = api.game.isGameRunning;

const startPosOptions: Array<{ label: string; value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes },
];

function setBoxes(boxes: StartBox[]) {
    props.battle.setStartBoxes(boxes);
}

function onStartPosChange(startPosType: StartPosType) {
    props.battle.setStartPosType(startPosType);
}

function openMapList() {
    mapListOpen.value = true;
}
function openMapOptions() {
    // TODO
}

function onEngineSelected(engineVersion: string) {
    props.battle.setEngine(engineVersion);
}

function onGameSelected(gameVersion: string) {
    props.battle.setGame(gameVersion);
}
async function openGameOptions() {
    // TODO: show loader on button (maybe @clickAsync event?)
    gameOptions.value = await api.content.game.getGameOptions(props.battle.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setGameOptions(options: Record<string, any>) {
    props.battle.setGameOptions(options);
}

function onMapSelected(mapScriptName: string) {
    mapListOpen.value = false;
    props.battle.setMap(mapScriptName);
}

function onPresetSelected(preset: string) {
    api.comms.request("c.lobby.message", {
        message: `!cv preset ${preset}`,
    });
}

function onBalanceModeSelected(balanceMode: string) {
    api.comms.request("c.lobby.message", {
        message: `!cv balanceMode ${balanceMode}`,
    });
}

function onAutoBalanceSelected(autoBalance: string) {
    api.comms.request("c.lobby.message", {
        message: `!cv autoBalance ${autoBalance}`,
    });
}

function onNbTeamsSelected(nbTeams: number) {
    api.comms.request("c.lobby.message", {
        message: `!cv nbTeams ${nbTeams}`,
    });
}

function onTeamSizeSelected(teamSize: number) {
    api.comms.request("c.lobby.message", {
        message: `!cv teamSize ${teamSize}`,
    });
}

function onLockedChanged(locked: boolean) {
    api.comms.request("c.lobby.message", {
        message: `!${locked ? "lock" : "unlock"}`,
    });
}

function toggleReady() {
    api.comms.request("c.lobby.update_status", {
        client: {
            ready: !props.me.battleStatus.ready,
        },
    });
}

function joinQueue() {
    api.comms.request("c.lobby.message", {
        message: "$joinq",
    });
}

function leaveQueue() {
    api.comms.request("c.lobby.message", {
        message: "$leaveq",
    });
}

function leave() {
    props.battle.leave();
}
async function start() {
    props.battle.start();
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
        "header chat settings"
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
.subtitle {
    font-size: 16px;
}
.box-buttons {
    display: flex;
    flex-direction: row;
    gap: 2px;
    :deep(button) {
        min-height: unset;
        padding: 5px;
        &:hover {
            img {
                opacity: 1;
            }
        }
    }
    img {
        max-width: 23px;
        image-rendering: pixelated;
        opacity: 0.7;
    }
}
</style>
