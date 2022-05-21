<template>
    <div class="battle flex-row flex-grow gap-lg">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-col flex-grow">
                <h1>{{ battleTitle }}</h1>
                <Playerlist />
            </div>
            <div>
                <BattleChat />
            </div>
        </div>
        <div class="battle__right gap-md">
            <MapPreview />
            <div class="flex-row gap-md">
                <Select
                    v-model="battle.battleOptions.mapFileName"
                    label="Map"
                    :options="installedMaps"
                    :labelBy="(map: any) => map.friendlyName"
                    :valueBy="(map: any) => map.fileNameWithExt"
                    closeOnSelect
                    clearOnSelect
                    searchable
                    fullWidth
                />
                <Button :flexGrow="false">
                    <Icon icon="cog" />
                </Button>
            </div>
            <div class="flex-row gap-md">
                <Select
                    v-model="selectedGame"
                    label="Game"
                    :options="games"
                    closeOnSelect
                    clearOnSelect
                    searchable
                    :disabled="!battle.battleOptions.offline"
                    fullWidth
                />
                <Button :flexGrow="false" @click="openGameOptions">
                    <Icon icon="cog" />
                </Button>
                <LuaOptionsModal id="game-options" v-model="battle.battleOptions.gameOptions" :title="`Game Options - ${battle.battleOptions.gameVersion}`" :sections="gameOptions" height="700px" />
            </div>
            <Select
                v-model="selectedEngine"
                label="Engine"
                :options="engines"
                closeOnSelect
                clearOnSelect
                searchable
                :disabled="!battle.battleOptions.offline"
                fullWidth
            />
            <div class="flex-row flex-bottom gap-md">
                <Button class="btn--red" fullwidth @click="leave">
                    Leave
                </Button>
                <Button class="btn--green" fullwidth @click="start">
                    Start
                </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, Ref, ref } from "vue";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "@/components/inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import { lastInArray } from "jaz-ts-utils";
import BattleChat from "@/components/battle/BattleChat.vue";
import Icon from "@/components/common/Icon.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import { LuaOptionSection } from "@/model/lua-options";

const battleTitle = ref("Offline Custom Battle");

const battle = api.session.currentBattle;

const installedMaps = computed(() => Object.values(api.content.maps.installedMaps));

const games = computed(() => api.content.game.installedVersions.map(rapidVersion => rapidVersion.version.fullString).slice(-10));
const selectedGame = ref(lastInArray(games.value)!);

const gameOptions: Ref<LuaOptionSection[]> = ref([]);
const openGameOptions = async () => {
    gameOptions.value = await api.content.game.getGameOptions(battle.battleOptions.gameVersion);
    api.modals.open("game-options");
};

const engines = computed(() => api.content.engine.installedVersions);
const selectedEngine = ref(lastInArray(engines.value));

const leave = () => {
    // TODO
};

const start = async () => {
    api.game.launch(battle);
};
</script>