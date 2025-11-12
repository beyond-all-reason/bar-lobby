<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="mode-select">
        <div
            class="mode-column classic"
            @click="
                battleActions.loadGameMode(GameModeID.CLASSIC);
                $emit('selected');
            "
        >
            <span>{{ t("lobby.components.misc.gameModeSelector.classic") }}</span>
            <button class="quick-play-button">{{ t("lobby.components.misc.gameModeSelector.classicDescription") }}</button>
        </div>
        <div
            class="mode-column raptors"
            @click="
                battleActions.loadGameMode(GameModeID.RAPTORS);
                $emit('selected');
            "
        >
            <span>{{ t("lobby.components.misc.gameModeSelector.raptors") }}</span>
            <button class="quick-play-button">{{ t("lobby.components.misc.gameModeSelector.raptorsDescription") }}</button>
        </div>
        <div
            class="mode-column scavengers"
            @click="
                battleActions.loadGameMode(GameModeID.SCAVENGERS);
                $emit('selected');
            "
        >
            <span>{{ t("lobby.components.misc.gameModeSelector.scavengers") }}</span>
            <button class="quick-play-button">{{ t("lobby.components.misc.gameModeSelector.scavengersDescription") }}</button>
        </div>
        <div
            class="mode-column ffa"
            @click="
                battleActions.loadGameMode(GameModeID.FFA);
                $emit('selected');
            "
        >
            <span>{{ t("lobby.components.misc.gameModeSelector.ffa") }}</span>
            <button class="quick-play-button">{{ t("lobby.components.misc.gameModeSelector.ffaDescription") }}</button>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { GameModeID } from "@main/game/battle/battle-types";
import { battleActions } from "@renderer/store/battle.store";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

defineEmits(["selected"]);
</script>

<style lang="scss" scoped>
.mode-select {
    display: flex;
    height: 100%;
    overflow: visible;
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
    filter: brightness(0.7);
    transform: skewX(-5deg);
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
    flex: 1.5;
    z-index: 1;
    filter: brightness(1);
    transform: scale(1.05) skewX(0deg);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5);
}

.quick-play-button {
    height: 120px;
    width: 100%;
    align-self: center;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 20px calc(50% - 122px);
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.quick-play-button:hover {
    box-shadow: 0 12px 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button:hover::before {
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
}
</style>
