<template>
    <div class="battle flex-row flex-grow gap-lg">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-col gap-sm">
                <h1 class="title">{{ battle.battleOptions.title }}</h1>
                <div v-if="!isOfflineBattle" class="subtitle flex-row gap-md">
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
            <Playerlist :battle="battle" :me="me" />
            <BattleChat v-if="!isOfflineBattle" :battle="battle" />
        </div>
        <div class="right-col flex-col gap-md">
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
                        <img src="@/assets/images/icons/east-vs-west.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NorthVsSouth)">
                        <img src="@/assets/images/icons/north-vs-south.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NortheastVsSouthwest)">
                        <img src="@/assets/images/icons/northeast-vs-southwest.png" />
                    </Button>
                    <Button @click="setBoxes(defaultBoxes().NorthwestVsSouthEast)">
                        <img src="@/assets/images/icons/northwest-vs-southeast.png" />
                    </Button>
                </div>
            </div>

            <div class="flex-row gap-md">
                <Select
                    :modelValue="battle.battleOptions.map"
                    :options="installedMaps"
                    label="Map"
                    optionLabel="friendlyName"
                    optionValue="scriptName"
                    :filter="true"
                    class="fullwidth"
                    :placeholder="battle.battleOptions.map"
                    @update:model-value="onMapSelected"
                />
                <Button @click="openMapList">
                    <Icon :icon="listIcon" height="23" />
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
                    :disabled="!isOfflineBattle"
                    class="fullwidth"
                    @update:model-value="onGameSelected"
                />
                <Button @click="openGameOptions">
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
                :disabled="!isOfflineBattle"
                class="fullwidth"
                @update:model-value="onEngineSelected"
            />
            <Markdown
                source="TODO: boss, ring, forcespec, kick, ban, preset, votes, rename battle, custom boxes, 
            show non-default mod/map options, tweakunits, stop, rejoin, balance mode"
            />
            <div class="flex-row flex-bottom gap-md">
                <Button class="red fullwidth" @click="leave"> Leave </Button>
                <Button v-if="!isOfflineBattle" class="fullwidth" :class="{ gray: !me.battleStatus.ready, green: me.battleStatus.ready }" :disabled="me.battleStatus.isSpectator" @click="toggleReady">
                    Ready
                </Button>
                <Button class="green fullwidth" :disabled="isGameRunning" @click="start">
                    {{ battle.battleOptions.startTime === null ? "Start" : "Join" }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import cogIcon from "@iconify-icons/mdi/cog";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import { computed, Ref, ref } from "vue";
import Markdown from "vue3-markdown-it";

import BattleChat from "@/components/battle/BattleChat.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import MapListModal from "@/components/battle/MapListModal.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import Button from "@/components/controls/Button.vue";
import Options from "@/components/controls/Options.vue";
import Select from "@/components/controls/Select.vue";
import MapPreview from "@/components/maps/MapPreview.vue";
import Flag from "@/components/misc/Flag.vue";
import { defaultBoxes } from "@/config/default-boxes";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { StartBox, StartPosType } from "@/model/battle/types";
import { LuaOptionSection } from "@/model/lua-options";
import { CurrentUser } from "@/model/user";

const props = defineProps<{
    battle: AbstractBattle;
    me: CurrentUser;
}>();

const isOfflineBattle = props.battle instanceof OfflineBattle;
const installedEngines = computed(() => api.content.engine.installedVersions);
const installedMaps = computed(() =>
    api.content.maps.installedMaps.sort((a, b) => {
        return a.friendlyName.localeCompare(b.friendlyName);
    })
);
const installedGames = computed(() => Array.from(api.content.game.installedVersions));
const mapListOpen = ref(false);
const gameOptionsOpen = ref(false);
const gameOptions: Ref<LuaOptionSection[]> = ref([]);
const isGameRunning = api.game.isGameRunning;

const startPosOptions: Array<{ label: string; value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.Boxes },
];

const setBoxes = (boxes: StartBox[]) => {
    props.battle.setStartBoxes(boxes);
};

const onStartPosChange = (startPosType: StartPosType) => {
    props.battle.setStartPosType(startPosType);
};

const openMapList = () => {
    mapListOpen.value = true;
};

const onEngineSelected = (engineVersion: string) => {
    props.battle.setEngine(engineVersion);
};

const onGameSelected = (gameVersion: string) => {
    props.battle.setGame(gameVersion);
};
const openGameOptions = async () => {
    // TODO: show loader on button (maybe @clickAsync event?)
    gameOptions.value = await api.content.game.getGameOptions(props.battle.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setGameOptions = (options: Record<string, any>) => {
    props.battle.setGameOptions(options);
};

const onMapSelected = (mapScriptName: string) => {
    mapListOpen.value = false;
    props.battle.setMap(mapScriptName);
};

const toggleReady = () => {
    api.comms.request("c.lobby.update_status", {
        client: {
            ready: !props.me.battleStatus.ready,
        },
    });
};

const leave = () => {
    props.battle.leave();
};
const start = async () => {
    props.battle.start();
};
</script>

<style lang="scss" scoped>
.battle {
    max-height: 100%;
}
.right-col {
    min-width: 500px;
    max-width: 500px;
}
.title {
    line-height: 0.8;
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
