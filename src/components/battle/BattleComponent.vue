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
                <Select v-model="battle.battleOptions.mapFileName" label="Map" :options="installedMaps" :label-by="(map: any) => map.friendlyName" :value-by="(map: any) => map.fileNameWithExt" close-on-select clear-on-select searchable full-width />
                <Button :flex-grow="false">
                    <Icon icon="cog" />
                </Button>
            </div>
            <div class="flex-row gap-md">
                <Options v-model="battle.battleOptions.startPosType" label="Start Pos" required full-width>
                    <Option v-for="option in startPosOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </Option>
                </Options>
                <Options v-model="battle.battleOptions.teamPreset" label="Team Preset" required full-width>
                    <Option v-for="option in teamPresetOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </Option>
                </Options>
            </div>
            <div class="flex-row gap-md">
                <Select v-model="selectedGame" label="Game" :options="games" close-on-select clear-on-select searchable :disabled="!battle.battleOptions.offline" full-width />
                <Button :flex-grow="false" @click="openGameOptions">
                    <Icon icon="cog" />
                </Button>
                <LuaOptionsModal id="game-options" v-model="battle.gameOptions" :title="`Game Options - ${battle.battleOptions.gameVersion}`" :sections="gameOptions" />
            </div>
            <Select v-model="selectedEngine" label="Engine" :options="engines" close-on-select clear-on-select searchable :disabled="!battle.battleOptions.offline" full-width />
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
import { computed, onMounted, Ref, ref, watch } from "vue";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "@/components/inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import { lastInArray } from "jaz-ts-utils";
import BattleChat from "@/components/battle/BattleChat.vue";
import { StartPosType, TeamPreset } from "@/model/battle/types";
import Options from "@/components/inputs/Options.vue";
import Option from "@/components/inputs/Option.vue";
import Icon from "@/components/common/Icon.vue";
import LuaOptionsModal from "@/components/battle/LuaOptionsModal.vue";
import { LuaOptionSection } from "@/model/lua-options";

const battleTitle = ref("Offline Custom Battle");

const battle = api.battle;

const installedMaps = computed(() => Object.values(api.content.maps.installedMaps));

const startPosOptions: Array<{ label: string, value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.ChooseInGame }
];

const teamPresetOptions: Array<{ label: string, value: TeamPreset }> = [
    { label: "Standard", value: TeamPreset.Standard },
    { label: "FFA", value: TeamPreset.FFA },
    { label: "Custom", value: TeamPreset.Custom },
];

const games = computed(() => api.content.game.installedVersions.map(rapidVersion => rapidVersion.version.fullString).slice(-10));
const selectedGame = ref(lastInArray(games.value)!);

const gameOptions: Ref<LuaOptionSection[]> = ref([]);
onMounted(async () => {
    gameOptions.value = await api.content.game.getGameOptions(battle.battleOptions.gameVersion);
});
watch(() => battle.battleOptions.gameVersion, async () => {
    gameOptions.value = await api.content.game.getGameOptions(battle.battleOptions.gameVersion);
});
const openGameOptions = () => {
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