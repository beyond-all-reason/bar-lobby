<route lang="json5">
{ meta: { title: "Overview", order: 0, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="overview-container">
            <div class="columns">
                <div class="left-column">
                    <NewsFeed />
                </div>
                <div class="center-column">
                    <img class="logo" src="/src/renderer/assets/images/BARLogoFull.png" />
                    <div class="new-lobby-alpha">A new lobby has landed</div>
                    <div class="new-lobby-subtext">
                        Welcome to the new BAR lobby public testing alpha 1 commander !<br />This version only supports singleplayer game
                        modes.
                    </div>
                    <div class="button-container">
                        <button class="quick-play-button" @click="battleStore.isSelectingGameMode = true">Quick play</button>
                    </div>
                </div>
                <div class="right-column">
                    <DevlogFeed />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import DevlogFeed from "@renderer/components/misc/DevlogFeed.vue";
import NewsFeed from "@renderer/components/misc/NewsFeed.vue";
import { battleStore } from "@renderer/store/battle.store";
import { watch } from "vue";

watch(
    () => battleStore.isSelectingGameMode,
    (newValue) => {
        battleStore.isLobbyOpened = !newValue;
    }
);
</script>

<style lang="scss" scoped>
.overview-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    width: 100%;
    height: 100%;
    padding: 20px 60px;
}

.logo {
    margin-top: 30px;
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    align-self: center;
    width: 500px;
}

.new-lobby-alpha {
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    font-size: 32px;
    margin-top: 30px;
    align-self: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 10px;
    margin-bottom: 10px;
}

.new-lobby-subtext {
    color: rgba(255, 255, 255, 0.8);
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    max-width: 800px;
    text-align: center;
    font-size: 20px;
    align-self: center;
}

.button-container {
    display: flex;
    justify-content: center;
    margin-top: 40px;
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

.columns {
    display: flex;
    gap: 16px;
    height: 100%;
}

.left-column,
.right-column {
    width: 460px;
    height: 100%;
}

.center-column {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
}
</style>
