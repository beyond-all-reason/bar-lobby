<template>
    <div class="battle flex-row flex-grow gap-lg">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-col flex-grow">
                <h1>{{ battleTitle }}</h1>
                <Playerlist :battle="battle" />
            </div>
            <div v-if="!isOfflineBattle">
                <BattleChat :battle="battle" />
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
                    optionValue="scriptName"
                    :filter="true"
                    :placeholder="currentMapName"
                    @update:model-value="onMapSelected"
                />
                <Button>
                    <Icon :icon="cog" height="23" />
                </Button>
            </div>
            <div class="flex-row gap-md">
                <Select
                    :value="currentGameName"
                    :options="installedGames"
                    label="Game"
                    :filter="true"
                    :placeholder="currentGameName"
                    :disabled="!isOfflineBattle"
                    @update:model-value="onGameSelected"
                />
                <Button @click="openGameOptions">
                    <Icon :icon="cog" height="23" />
                </Button>
                <LuaOptionsModal
                    id="game-options"
                    v-model="gameOptionsOpen"
                    :luaOptions="battle.battleOptions.gameOptions"
                    :title="`Game Options - ${battle.battleOptions.gameVersion}`"
                    :sections="gameOptions"
                    height="700px"
                    @set-options="setGameOptions"
                />
            </div>
            <Select
                :value="currentEngineName"
                :options="installedEngines"
                label="Engine"
                :filter="true"
                :placeholder="currentEngineName"
                :disabled="!isOfflineBattle"
                @update:model-value="onEngineSelected"
            />
            <div class="flex-row flex-bottom gap-md">
                <Button class="red fullwidth" @click="leave"> Leave </Button>
                <ToggleButton
                    v-if="!isOfflineBattle"
                    v-model="me.battleStatus.ready"
                    class="fullwidth"
                    onText="Unready"
                    offText="Ready Up"
                    :onClasses="['green']"
                    :offClasses="['red']"
                    :disabled="me.battleStatus.isSpectator"
                    @click="toggleReady"
                />
                <Button class="green fullwidth" @click="start"> Start </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import cog from "@iconify-icons/mdi/cog";
import { computed, Ref, ref, watch } from "vue";

import BattleChat from "@/components/battle/BattleChat.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import Button from "@/components/inputs/Button.vue";
import Select from "@/components/inputs/Select.vue";
import ToggleButton from "@/components/inputs/ToggleButton.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { LuaOptionSection } from "@/model/lua-options";

const props = defineProps<{
    battle: AbstractBattle;
}>();

const isOfflineBattle = props.battle instanceof OfflineBattle;

const battleTitle = ref(props.battle.battleOptions.title);

const me = api.session.currentUser;

const installedMaps = computed(() => Array.from(api.content.maps.installedMaps.values()));
const currentMapData = computed(() => installedMaps.value.find((map) => map?.scriptName === props.battle.battleOptions.map));
const currentMapName = ref(currentMapData?.value?.friendlyName ?? props.battle.battleOptions.map);
watch(
    () => props.battle.battleOptions.map,
    (mapScriptName) => {
        currentMapName.value = currentMapData?.value?.friendlyName ?? mapScriptName;
    }
);
const onMapSelected = (mapScriptName: string) => {
    props.battle.changeMap(mapScriptName);
};

const installedGames = computed(() => api.content.game.installedVersions.map((rapidVersion) => rapidVersion.version).slice(-10));
const currentGameName = ref(props.battle.battleOptions.gameVersion);
watch(
    () => props.battle.battleOptions.gameVersion,
    () => {
        currentGameName.value = props.battle.battleOptions.gameVersion;
    }
);
const onGameSelected = (gameVersion: string) => {
    props.battle.changeGame(gameVersion);
};

const gameOptionsOpen = ref(false);
const gameOptions: Ref<LuaOptionSection[]> = ref([]);
const openGameOptions = async () => {
    gameOptions.value = await api.content.game.getGameOptions(props.battle.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setGameOptions = (options: Record<string, any>) => {
    props.battle.setGameOptions(options);
};

const installedEngines = computed(() => api.content.engine.installedVersions);
const currentEngineName = ref(props.battle.battleOptions.engineVersion);
watch(
    () => props.battle.battleOptions.engineVersion,
    () => {
        currentEngineName.value = props.battle.battleOptions.engineVersion;
    }
);
const onEngineSelected = (engineVersion: string) => {
    props.battle.changeEngine(engineVersion);
};
if (!api.content.engine.isEngineVersionInstalled(props.battle.battleOptions.engineVersion)) {
    api.content.engine.downloadEngine(props.battle.battleOptions.engineVersion);
}

const leave = () => {
    props.battle.leave();
};
const start = async () => {
    api.game.launch(props.battle);
};
const toggleReady = () => {
    api.comms.request("c.lobby.update_status", {
        client: {
            ready: !me.battleStatus.ready,
        },
    });
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
