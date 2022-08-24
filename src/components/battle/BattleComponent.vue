<template>
    <div class="battle flex-row flex-grow gap-lg">
        <div class="flex-col flex-grow gap-md">
            <div class="flex-col flex-grow">
                <div class="flex-col margin-bottom-lg">
                    <h1 class="title">{{ battle.battleOptions.title }}</h1>
                    <div v-if="!isOfflineBattle" class="subtitle flex-row gap-sm">
                        Hosted by
                        <div class="founder flex-row gap-sm">
                            {{ battle.founder.value.username }}
                            <Flag :countryCode="battle.founder.value.countryCode" style="width: 16px" />
                        </div>
                    </div>
                </div>
                <Playerlist :battle="battle" />
            </div>
            <div v-if="!isOfflineBattle">
                <BattleChat :battle="battle" />
            </div>
        </div>
        <div class="right-col flex-col gap-md">
            <MapPreview :battle="battle" />
            <div class="flex-row gap-md">
                <Select
                    :modelValue="battle.battleOptions.map"
                    :options="installedMaps"
                    label="Map"
                    optionLabel="friendlyName"
                    optionValue="scriptName"
                    :filter="true"
                    :placeholder="battle.battleOptions.map"
                    @update:model-value="onMapSelected"
                />
                <Button>
                    <Icon :icon="cog" height="23" />
                </Button>
            </div>
            <div class="flex-row gap-md">
                <Select
                    :modelValue="battle.battleOptions.gameVersion"
                    :options="installedGames"
                    label="Game"
                    :filter="true"
                    :placeholder="battle.battleOptions.gameVersion"
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
                :modelValue="battle.battleOptions.engineVersion"
                :options="installedEngines"
                label="Engine"
                :filter="true"
                :placeholder="battle.battleOptions.engineVersion"
                :disabled="!isOfflineBattle"
                @update:model-value="onEngineSelected"
            />
            <Markdown
                source="TODO: boss, ring, forcespec, kick, ban, preset, votes, rename battle, custom boxes, 
            show non-default mod/map options, tweakunits, stop, rejoin, balance mode"
            />
            <div class="flex-row flex-bottom gap-md">
                <Button class="fullwidth" color="red" @click="leave"> Leave </Button>
                <ToggleButton
                    v-if="!isOfflineBattle"
                    v-model="me.battleStatus.ready"
                    class="fullwidth"
                    onText="Unready"
                    offText="Ready Up"
                    :onClasses="['green']"
                    :offClasses="['gray']"
                    :disabled="me.battleStatus.isSpectator"
                    @click="toggleReady"
                />
                <Button class="fullwidth" color="green" @click="start"> Start </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import cog from "@iconify-icons/mdi/cog";
import { computed, Ref, ref } from "vue";
import Markdown from "vue3-markdown-it";

import BattleChat from "@/components/battle/BattleChat.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import Button from "@/components/inputs/Button.vue";
import Select from "@/components/inputs/Select.vue";
import ToggleButton from "@/components/inputs/ToggleButton.vue";
import Flag from "@/components/misc/Flag.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { OfflineBattle } from "@/model/battle/offline-battle";
import { LuaOptionSection } from "@/model/lua-options";

const props = defineProps<{
    battle: AbstractBattle;
}>();

const isOfflineBattle = props.battle instanceof OfflineBattle;
const me = api.session.currentUser;
const installedEngines = computed(() => api.content.engine.installedVersions);
const installedMaps = computed(() => Array.from(api.content.maps.installedMaps.values()));
const installedGames = computed(() => api.content.game.installedVersions.map((rapidVersion) => rapidVersion.version).slice(-10));
const gameOptionsOpen = ref(false);
const gameOptions: Ref<LuaOptionSection[]> = ref([]);

props.battle.open();

const onEngineSelected = (engineVersion: string) => {
    props.battle.changeEngine(engineVersion);
};

const onGameSelected = (gameVersion: string) => {
    props.battle.changeGame(gameVersion);
};
const openGameOptions = async () => {
    gameOptions.value = await api.content.game.getGameOptions(props.battle.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setGameOptions = (options: Record<string, any>) => {
    props.battle.setGameOptions(options);
};

const onMapSelected = (mapScriptName: string) => {
    props.battle.changeMap(mapScriptName);
};

const toggleReady = () => {
    api.comms.request("c.lobby.update_status", {
        client: {
            ready: !me.battleStatus.ready,
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
.right-col {
    min-width: 500px;
    max-width: 500px;
}
.title {
    line-height: 0.8;
}
.subtitle {
    font-size: 16px;
    margin-left: 2px;
    opacity: 0.8;
}
</style>
