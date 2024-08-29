<!--
TODO:
    - Player name
    - Avatar - Steam or choose from BAR selection?
    - Profile level (fancy banner associated with level?)
    - Ranks in each playlist
    - Simple stats - games played, favourite faction, favourite mode
    - Recent achievements unlocked
    - Recent activity/matches
-->

<route lang="json5">
{ props: true, meta: { title: "Profile", hide: true, transition: { name: "slide-left" } } }
</route>
<template>
    <div>
        <div class="warn-message">not a real profile stats, TODO replace with api</div>
        <div v-if="user">
            <div class="profile-header">
                <img ref="logo" class="avatar" src="/images/BARLogoFull.png" />
                <div class="profile-user-info">
                    <h2 class="flex-row gap-lg">
                        <Flag :countryCode="user.countryCode" style="width: 50px" />
                        {{ user.username }}
                    </h2>
                    <p>User ID: {{ user.userId }}</p>
                    <!-- email info is not it user object -->
                    <p>email@email.com</p>
                    <Button class="slim" @click="onChangeEmailModalOpen()"> Change email </Button>
                    <p>
                        <i class="steam-icon"></i>
                        Steam ID: 5845926471791
                    </p>
                </div>
                <div class="profile-info">
                    <h5>Win Rate</h5>
                    <p>64%</p>
                    <p>960W - 540L</p>
                </div>
                <div class="profile-info">
                    <h5>Favorite Faction</h5>
                    <h6 class="armada">ARMADA</h6>
                    <p>360W - 200L WR 64%</p>
                </div>
                <div class="profile-info">
                    <h5>AVG APM</h5>
                    <h6>145</h6>
                </div>
            </div>
            <hr class="margin-top-sm margin-bottom-sm" />
            <div class="season-selector">
                <Select v-model="seasonMethod" class="season-select" :options="seasonsList" label="Season" />
                <Select v-model="gameType" class="game-type-select" :options="gameTypeOptions" label="" />
            </div>
            <div v-if="selectedSeasonData" class="selected-season">
                <div>
                    <img v-if="selectedSeasonData && selectedSeasonData?.rank" class="rank" :src="avatarSrc" alt="Avatar" />
                </div>
                <div class="profile-info">
                    <p>OPEN SKILL</p>
                    <p>{{ selectedSeasonData?.openSkill }}</p>
                </div>
                <div class="profile-info">
                    <p>WIN RATE</p>
                    <p>{{ (selectedSeasonData.winRate * 100).toFixed(2) }}%</p>
                    <p>{{ selectedSeasonData?.win }}W - {{ selectedSeasonData?.lost }}L</p>
                </div>
                <div class="profile-info">
                    <p>AVG APM</p>
                    <p>{{ selectedSeasonData?.averageAPM }}</p>
                </div>
                <div>
                    <div v-for="(armyName, index) in armyNames" :key="index" class="army-stats">
                        <h6 :class="armyName">{{ armyName.toUpperCase() }}</h6>
                        <p>{{ generateArmyStats(selectedSeasonData, armyName) }}</p>
                    </div>
                </div>
                <div>
                    <h5>Most DMG</h5>
                    <img
                        v-if="selectedSeasonData && selectedSeasonData?.featuredUnit"
                        class="profile-unit"
                        :src="featuredUnit"
                        alt="Avatar"
                    />
                </div>
            </div>
            <hr class="margin-top-sm margin-bottom-sm" />
            <!-- not implemented yet -->
            <Modal v-model="changeEmailOpen" title="Change Email" @submit="changeEmail">
                <div class="flex-col gap-md">
                    <p>New email</p>
                    <Textbox type="newSteamID" name="newSteamID" class="fullwidth" />
                    <Button type="submit">Submit</Button>
                </div>
            </Modal>
        </div>
        <div v-else>No user found with UserID: {{ props.id }}</div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ComputedRef, Ref, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Select from "@/components/controls/Select.vue";
import Textbox from "@/components/controls/Textbox.vue";
import Flag from "@/components/misc/Flag.vue";
// replace with real api call
// eslint-disable-next-line no-restricted-imports
import { SeasonData, seasonsData, seasonsList } from "@/utils/temp-seasons-data.js";

const props = defineProps<{
    id: string;
}>();

// temp disabled
// interface SteamUserInfo {
//     avatarfull?: string;
//     personaname?: string;
//     realname?: string;
//     profileurl?: string;
// }

const user = computed(() => api.session.getUserById(props.id));

const changeEmailOpen = ref(false);
const armyNames = ["armada", "cortex", "legion"];

const avatarSrc = computed(() => `/temp-acc-mock/${selectedSeasonData?.value?.rank}.png`);
const featuredUnit = computed(() => `/temp-acc-mock/${selectedSeasonData?.value?.featuredUnit}.png`);

function generateArmyStats(selectedSeasonData, armyName) {
    const winRate = (selectedSeasonData[armyName]?.winRate * 100).toFixed(0);
    return `${selectedSeasonData[armyName]?.win}W - ${selectedSeasonData[armyName]?.lost}L WR ${winRate}%`;
}

const gameTypeOptions = ["1v1", "2v2", "3v3", "4v4"];
const seasonMethod: Ref<string> = ref(seasonsList[0]);
const gameType: Ref<string> = ref("1v1");
const selectedSeason: Ref<string> = computed(() => seasonMethod.value);

const selectedSeasonData: ComputedRef<SeasonData | undefined> = computed(() => {
    const season = seasonsData.find((s) => s.seasonName === selectedSeason.value);
    if (!season) {
        return undefined;
    }

    return season.seasonData.find((s) => s.gameType === gameType.value);
});

// to do implement after api is ready
function changeEmail() {
    changeEmailOpen.value = false;
}

function onChangeEmailModalOpen() {
    changeEmailOpen.value = true;
}
</script>

<style lang="scss" scoped>
.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    margin-top: 25px;
    div {
        margin-right: auto;
    }
}

.avatar {
    width: 184px;
    height: 184px;
    border-radius: 1%;
    margin-right: 20px;
    border: 1px solid #5e5757;
    backdrop-filter: blur(2px);
}

.rank {
    width: 80px;
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.profile-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.profile-user-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.selected-season {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    margin-top: 25px;
    div {
        margin: auto;
    }
}

.army-stats {
    p {
        font-size: 14px;
        margin-bottom: 5px;
    }
}

.profile-unit {
    width: 100px;
    height: 100px;
    border-radius: 1%;
    margin-left: 12px;
}

.armada {
    color: #2ba5ea;
}

.cortex {
    color: #ff0000;
}

.legion {
    color: #afa6a6;
}
.season-selector {
    display: flex;
    gap: 5px;
    margin-top: 20px;
    .season-select {
        width: 500px;
    }
    .game-type-select {
        max-width: 100px;
    }
}

.warn-message {
    font-size: 11px;
    color: orange;
    margin-left: auto;
}
</style>
