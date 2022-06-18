<template>
    <div class="battle flex-row flex-grow gap-lg">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-col flex-grow">
                <h1>{{ battleTitle }}</h1>
                <Playerlist :battle="battle" />
            </div>
            <div v-if="!isOfflineBattle">
                <BattleChat />
            </div>
        </div>
        <div class="flex-col gap-md">
            <MapPreview :battle="battle" />
            <div class="flex-row gap-md">
                <Select
                    :value="currentMapName"
                    :options="installedMaps"
                    label="Map"
                    optionLabel="friendlyName"
                    optionValue="fileNameWithExt"
                    :filter="true"
                    :placeholder="currentMapData?.friendlyName"
                    @update:model-value="onMapSelected"
                />
                <Button :flexGrow="false">
                    <Icon :icon="cog" height="23" />
                </Button>
            </div>
            <div class="flex-row gap-md">
                <Select v-model="selectedGame" label="Game" :options="games" :filter="true" :disabled="!isOfflineBattle" />
                <Button :flexGrow="false" @click="openGameOptions">
                    <Icon :icon="cog" height="23" />
                </Button>
                <LuaOptionsModal
                    id="game-options"
                    v-model="gameOptionsOpen"
                    :luaOptions="battle.battleOptions.gameOptions"
                    :title="`Game Options - ${battle.battleOptions.gameVersion}`"
                    :sections="gameOptions"
                    height="700px"
                    @set-option="setGameOption"
                />
            </div>
            <Select v-model="selectedEngine" label="Engine" :options="engines" :filter="true" :disabled="!isOfflineBattle" />
            <div class="flex-row flex-bottom gap-md">
                <Button class="btn--red" fullwidth @click="leave"> Leave </Button>
                <Button class="btn--green" fullwidth @click="start"> Start </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import cog from "@iconify-icons/mdi/cog";
import { lastInArray } from "jaz-ts-utils";
import { computed, Ref, ref, watch } from "vue";

import BattleChat from "@/components/battle/BattleChat.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import Button from "@/components/inputs/Button.vue";
import Select from "@/components/inputs/Select.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { LuaOptionSection } from "@/model/lua-options";

const props = defineProps<{
    battle: AbstractBattle;
}>();

const isOfflineBattle = props.battle instanceof OfflineBattle;

const battleTitle = ref(isOfflineBattle ? "Offline Custom Battle" : "Online Custom Battle");

const installedMaps = computed(() => Object.values(api.content.maps.installedMaps));
const currentMapName = ref(props.battle.battleOptions.mapFileName);
const currentMapData = computed(() => installedMaps.value.find((map) => map?.fileNameWithExt === currentMapName.value));
watch(
    () => props.battle.battleOptions.mapFileName,
    (mapFileName) => {
        currentMapName.value = mapFileName;
    }
);
const onMapSelected = (mapFileName: string) => {
    props.battle.changeMap(mapFileName);
};

const games = computed(() => api.content.game.installedVersions.map((rapidVersion) => rapidVersion.version.fullString).slice(-10));
const selectedGame = ref(lastInArray(games.value)!);

const gameOptionsOpen = ref(false);
const gameOptions: Ref<LuaOptionSection[]> = ref([]);
const openGameOptions = async () => {
    gameOptions.value = await api.content.game.getGameOptions(props.battle.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
};
const setGameOption = (key: string, value: any) => {
    console.log(key, value);
};

const engines = computed(() => api.content.engine.installedVersions);
const selectedEngine = ref(lastInArray(engines.value));

const leave = () => {
    // TODO
};
const start = async () => {
    api.game.launch(props.battle);
};
</script>

<style lang="scss" scoped>
.battle {
    &__panel {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
}
</style>
