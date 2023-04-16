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
    <div v-if="user">
        <div class="profile-header">
            <img v-if="steamUserInfo" class="avatar" :src="steamUserInfo && steamUserInfo?.avatarfull" alt="Avatar" />
            <img v-else ref="logo" class="avatar" src="/images/BARLogoFull.png" />
            <div class="profile-user-info">
                <h2 class="flex-row gap-lg">
                    <Flag :countryCode="user.countryCode" style="width: 50px" />
                    {{ user.username }}
                </h2>
                <p>User ID: {{ user.userId }}</p>
                <!-- email info is not it user object -->
                <p>email@email.com</p>
                <!-- temp this should not be showed -->
                <p>
                    <i class="steam-icon"></i>
                    Steam ID: {{ steamID }}
                </p>
                <!-- temp this should not be showed -->
                <Button class="slim" @click="changeSteamID()"> Change steam ID(test) </Button>
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
                <img v-if="selectedSeasonData && selectedSeasonData?.featuredUnit" class="profile-unit" :src="featuredUnit" alt="Avatar" />
            </div>
        </div>
        <hr class="margin-top-sm margin-bottom-sm" />
        <!-- just for testing -->
        <Modal v-model="changeSteamIDPromptOpen" title="Change Password" @submit="onSteamIDChangeSubmit">
            <div class="flex-col gap-md">
                <p>New steam ID</p>
                <Textbox type="newSteamID" name="newSteamID" class="fullwidth" />
                <Button type="submit">Submit</Button>
            </div>
        </Modal>
    </div>
    <div v-else>No user found with UserID: {{ props.id }}</div>
</template>

<script lang="ts" setup>
import axios from "axios";
import { computed, ComputedRef, defineProps, onMounted, Ref, ref } from "vue";

// replace with real api call
// eslint-disable-next-line no-restricted-imports
import { SeasonData, seasonsData, seasonsList } from "@/assets/temp-acc-mock/seasons-data.js";
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Select from "@/components/controls/Select.vue";
import Textbox from "@/components/controls/Textbox.vue";
import Flag from "@/components/misc/Flag.vue";

const props = defineProps<{
    id: string;
}>();

interface SteamUserInfo {
    avatarfull?: string;
    personaname?: string;
    realname?: string;
    profileurl?: string;
}

const user = computed(() => api.session.getUserById(parseInt(props.id)));
console.log(user.value);
const steamUserInfo: Ref<SteamUserInfo> = ref<SteamUserInfo>({});

// temp test of api call
// if you want to test this, open your steam profile online,
// id is in the url https://steamcommunity.com/profiles/<<<steamID>>>/
const steamID = ref("76561197960435530");
const changeSteamIDPromptOpen = ref(false);
const armyNames = ["armada", "cortex", "legion"];

function changeSteamID() {
    changeSteamIDPromptOpen.value = true;
}

const avatarSrc = computed(() => `/temp-acc-mock/${selectedSeasonData?.value?.rank}.png`);
const featuredUnit = computed(() => `/temp-acc-mock/${selectedSeasonData?.value?.featuredUnit}.png`);

async function onSteamIDChangeSubmit(e) {
    changeSteamIDPromptOpen.value = false;
    steamID.value = e.newSteamID;
    getSteamUserInfo(steamID.value);
}

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

async function getSteamUserInfo(steamID: string) {
    // temp api key
    // replace with steam integration
    const apiKey = process.env.VUE_APP_STEAM_API_KEY || "678F3C9B77262C5F37D749DE2FCE87A4";
    // to do replace
    const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamID}`;

    try {
        const response = await axios.get(apiUrl);
        steamUserInfo.value = response.data.response.players[0];
    } catch (error) {
        console.error("Error fetching Steam user info:", error);
    }
}

onMounted(async () => {
    getSteamUserInfo(steamID.value);
});
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
    gap: 2px;
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
</style>
