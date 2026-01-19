<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Matchmaking", order: 3, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="ranked-container">
            <div class="view-title">
                <h1>{{ t("lobby.multiplayer.ranked.title") }}</h1>
                <p>{{ t("lobby.multiplayer.ranked.description") }}</p>
            </div>
            <div class="my-rank">
                <div></div>
            </div>
            <div class="mode-select">
                <div v-if="matchmakingStore.isLoadingQueues" class="loading-queues">
                    {{ t("lobby.multiplayer.ranked.loadingQueues") }}
                </div>
                <div v-else-if="matchmakingStore.queueError" class="queue-error">
                    {{ t("lobby.multiplayer.ranked.queueError") }}: {{ matchmakingStore.queueError }}
                </div>
                <Button
                    v-else
                    v-for="queue in availableQueueIds"
                    :key="queue"
                    class="mode-column classic"
                    :class="{
                        selected: matchmakingStore.selectedQueue === queue,
                    }"
                    @click="() => (matchmakingStore.selectedQueue = queue)"
                    :disabled="matchmakingStore.status !== MatchmakingStatus.Idle"
                    ><span>{{ getPlaylistName(queue) }}</span></Button
                >
            </div>
            <div class="button-container">
                <DownloadContentButton
                    v-if="matchmakingStore.status === MatchmakingStatus.Idle"
                    :maps="selectedPlaylist?.maps.map((map) => map.springName) ?? []"
                    :engines="selectedPlaylist?.engines.map((map) => map.version) ?? []"
                    :games="selectedPlaylist?.games.map((map) => map.springName) ?? []"
                    size="large"
                    @click="matchmaking.sendQueueRequest"
                >
                    {{ t("lobby.multiplayer.ranked.buttons.searchGame") }}
                </DownloadContentButton>

                <button
                    v-else-if="matchmakingStore.status === MatchmakingStatus.JoinRequested"
                    class="quick-play-button searching"
                    disabled
                >
                    {{ t("lobby.multiplayer.ranked.buttons.joinRequested") }}
                </button>

                <button v-else-if="matchmakingStore.status === MatchmakingStatus.Searching" class="quick-play-button searching" disabled>
                    {{ t("lobby.multiplayer.ranked.buttons.searchingForOpponent") }}
                </button>

                <button
                    v-else-if="matchmakingStore.status === MatchmakingStatus.MatchFound"
                    class="quick-play-button"
                    @click="matchmaking.sendReadyRequest"
                >
                    {{ t("lobby.multiplayer.ranked.buttons.matchFound") }}
                </button>

                <button v-else-if="matchmakingStore.status === MatchmakingStatus.MatchAccepted" class="quick-play-button" disabled>
                    {{ t("lobby.multiplayer.ranked.buttons.accepted") }}
                </button>

                <button
                    class="cancel-button"
                    :disabled="matchmakingStore.status === MatchmakingStatus.Idle"
                    :class="{
                        disabled: matchmakingStore.status === MatchmakingStatus.Idle,
                    }"
                    @click="matchmaking.sendCancelRequest"
                >
                    {{ t("lobby.multiplayer.ranked.buttons.cancel") }}
                </button>

                <p class="txt-error" v-if="matchmakingStore.errorMessage">{{ matchmakingStore.errorMessage }}</p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { matchmaking, MatchmakingStatus, matchmakingStore, getPlaylistName } from "@renderer/store/matchmaking.store";
import Button from "primevue/button";
import { useTypedI18n } from "@renderer/i18n";
import { computed, onActivated } from "vue";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";

const { t } = useTypedI18n();

const availableQueueIds = computed(() => {
    return matchmakingStore.playlists.sort((a, b) => a.teamSize * a.numOfTeams - b.teamSize * b.numOfTeams).map((playlist) => playlist.id);
});

const selectedPlaylist = computed(() => {
    return matchmakingStore.playlists.find((playlist) => playlist.id === matchmakingStore.selectedQueue);
});

onActivated(() => {
    matchmaking.sendListRequest();
});
</script>

<style lang="scss" scoped>
.ranked-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: 20px;
    height: 100%;
    width: 1000px;
    overflow: visible;
}

.join-queue {
    margin: 0 auto;
    display: block;
    margin-top: 20px;
}

.mode-select {
    display: flex;
    height: 100%;
    overflow: visible;
    gap: 50px;
}

.loading-queues,
.queue-error {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 200px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.2rem;
    text-align: center;
}

.queue-error {
    color: #ff6b6b;
}

.mode-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    color: white;
    font-size: 2rem;
    text-align: center;
    transition: all 0.3s ease;
    filter: brightness(0.7) saturate(0.1);
    padding-top: 30px;
    span {
        font-size: 2rem;
        text-transform: uppercase;
        font-weight: bold;
        filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    }
    &.classic {
        background-image: url("/src/renderer/assets/images/backgrounds/5.jpg");
    }
    &.raptors {
        background-image: url("/src/renderer/assets/images/modes/raptors.jpg");
    }
    &.scavengers {
        background-image: url("/src/renderer/assets/images/modes/scavengers.webp");
    }
    &.ffa {
        background-image: url("/src/renderer/assets/images/modes/ffa.jpg");
    }
}

.mode-column:last-child {
    border-right: none;
}

/* On hover/active */
.mode-column:hover {
    z-index: 1;
    filter: brightness(1);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5);
}

.mode-column.selected {
    flex: 1.5;
    z-index: 1;
    filter: brightness(1);
    transform: scale(1.05);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5);
}

.button-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-top: 40px;
    margin-bottom: 40px;
    flex-grow: 1;
}

.searching {
    animation: pulse 3s infinite ease-in-out;
}

.quick-play-button {
    align-self: center;
    width: 500px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 20px 40px;
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.quick-play-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}

.quick-play-button:hover::before {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
}

.cancel-button {
    align-self: center;
    width: 200px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.5rem;
    padding: 20px 40px;
    color: #fff;
    // background: linear-gradient(90deg, #c52222, #a31616);
    border: none;
    border-radius: 2px;
    // box-shadow: 0 0 15px rgba(197, 34, 34, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.cancel-button:hover {
    // box-shadow: 0 0 25px rgba(197, 34, 34, 0.6);
    color: #eee;
    // transform: scale(0.99);
    text-shadow: 0 0 25px rgba(255, 255, 255, 0.6);
}

.cancel-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(105, 105, 105, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}

.disabled {
    cursor: not-allowed;
    opacity: 0.1;
}
</style>
