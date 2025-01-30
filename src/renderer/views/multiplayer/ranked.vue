<route lang="json5">
{ meta: { title: "Ranked", order: 0, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="ranked-background"></div>
        <div class="ranked-container">
            <div class="view-title">
                <h1>Ranked</h1>
                <p>Join a multiplayer ranked queue.</p>
            </div>
            <div class="my-rank">
                <div></div>
            </div>
            <div class="mode-select">
                <Button
                    class="mode-column classic"
                    :class="{
                        selected: matchmakingStore.selectedQueue === '2v2',
                    }"
                    @click="() => (matchmakingStore.selectedQueue = '2v2')"
                    :disabled="matchmakingStore.status !== MatchmakingStatus.Idle"
                    ><span>2 vs 2</span></Button
                >
                <Button
                    class="mode-column classic"
                    :class="{
                        selected: matchmakingStore.selectedQueue === '1v1',
                    }"
                    @click="() => (matchmakingStore.selectedQueue = '1v1')"
                    :disabled="matchmakingStore.status !== MatchmakingStatus.Idle"
                    ><span>DUEL</span></Button
                >
                <Button
                    class="mode-column classic"
                    :class="{
                        selected: matchmakingStore.selectedQueue === '3v3',
                    }"
                    @click="() => (matchmakingStore.selectedQueue = '3v3')"
                    :disabled="matchmakingStore.status !== MatchmakingStatus.Idle"
                    ><span>3 vs 3</span></Button
                >
            </div>
            <div class="button-container">
                <button
                    v-if="matchmakingStore.status === MatchmakingStatus.Idle"
                    class="quick-play-button"
                    :class="{
                        disabled: !matchmakingStore.selectedQueue,
                    }"
                    @click="matchmaking.startSearch"
                >
                    Search game
                </button>
                <button v-else-if="matchmakingStore.status === MatchmakingStatus.Searching" class="quick-play-button searching" disabled>
                    Searching for opponent
                </button>
                <button
                    v-else-if="matchmakingStore.status === MatchmakingStatus.MatchFound"
                    class="quick-play-button"
                    @click="matchmaking.acceptMatch"
                >
                    Match found
                </button>
                <button v-else-if="matchmakingStore.status === MatchmakingStatus.MatchAccepted" class="quick-play-button" disabled>
                    Accepted
                </button>
                <button
                    class="cancel-button"
                    :class="{
                        disabled: matchmakingStore.status === MatchmakingStatus.Idle,
                    }"
                    @click="matchmaking.stopSearch"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { matchmaking, MatchmakingStatus, matchmakingStore } from "@renderer/store/matchmaking.store";
import Button from "primevue/button";
</script>

<style lang="scss" scoped>
.ranked-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, #000000ba, #000000fd);
    transition: all 1s ease;
    // animation: pulse 1s infinite ease-in-out;
}

@keyframes pulse {
    0%,
    100% {
        background-size: 100% 100%;
        filter: brightness(0.8);
    }
    50% {
        background-size: 110% 110%;
        filter: brightness(1);
    }
}

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

.searching {
    animation: pulse 3s infinite ease-in-out;
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
