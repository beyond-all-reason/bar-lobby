<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Menu", order: 0, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view view-adjust-bottom">
        <div class="move-right">
            <div class="game-menu-container">
                <div class="game-modes-grid">
                    <Panel :no-padding="true" class="game-mode-card" @click="startSkirmish">
                        <div class="card-content">
                            <h2>Skirmish vs AI</h2>
                        </div>
                    </Panel>

                    <Panel :no-padding="true" class="game-mode-card disabled" @click="startCampaign">
                        <div class="card-content">
                            <h2>Campaign<span class="small-text margin-left-md">(Coming Soon)</span></h2>
                        </div>
                    </Panel>

                    <Panel :no-padding="true" class="game-mode-card disabled" @click="startMatchmaking">
                        <div class="card-content">
                            <h2>Matchmaking<span class="small-text margin-left-md">(Coming Soon)</span></h2>
                        </div>
                    </Panel>

                    <Panel :no-padding="true" class="game-mode-card" @click="openScenarios">
                        <div class="card-content">
                            <h2>Scenarios</h2>
                        </div>
                    </Panel>

                    <Panel :no-padding="true" class="game-mode-card disabled" @click="startCustomLobbies">
                        <div class="card-content">
                            <h2>Custom Lobbies<span class="small-text margin-left-md">(Coming Soon)</span></h2>
                        </div>
                    </Panel>

                    <Panel :no-padding="true" class="game-mode-card disabled" @click="openTournaments">
                        <div class="card-content">
                            <h2>Tournaments<span class="small-text margin-left-md">(Coming Soon)</span></h2>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { watch } from "vue";
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";
import { settingsStore } from "@renderer/store/settings.store";
import { battleStore } from "@renderer/store/battle.store";

const router = useRouter();

watch(
    () => battleStore.isSelectingGameMode,
    (newValue) => {
        battleStore.isLobbyOpened = !newValue;
    }
);

// Game mode handlers
const startSkirmish = () => {
    //router.push("/play/skirmishVsAi");
    battleStore.isSelectingGameMode = true;
};

const startCampaign = () => {
    if (settingsStore.devMode) {
        router.push("/play/campaign");
    }
};

const startMatchmaking = () => {
    if (settingsStore.devMode) {
        router.push("/play/matchmaking");
    }
};

const startCustomLobbies = () => {
    if (settingsStore.devMode) {
        router.push("/play/customLobbies");
    }
};

const openScenarios = () => {
    router.push("/play/scenarios");
};

const openTournaments = () => {
    if (settingsStore.devMode) {
        router.push("/play/tournaments");
    }
};
</script>

<style lang="scss" scoped>
.disabled {
    opacity: 60%;
}
.small-text {
    font-size: 60%;
}
.view-adjust-bottom {
    padding-bottom: 30px;
    display: flex;
    flex-direction: column-reverse;
}
.move-right {
    display: flex;
    flex-direction: row-reverse;
}
.game-menu-container {
    display: flex;
    flex-direction: column;
    width: 28%;
    height: 100%;
    padding: 40px 40px;
}

.game-modes-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 20px;
    margin: 0 0;
    flex: 1;
}

.game-mode-card {
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    min-height: 64px;
    transition: background-color 0.3s linear 0s;
    &.large {
        grid-column: span 1;
    }

    &.wide {
        grid-column: span 2;
    }

    .card-content {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        height: 100%;
        padding: 0; // Override Panel's default padding

        h2 {
            font-size: 1.8rem;
            font-weight: 600;
            margin: 0 0 0 0;
            color: white;
            font-family: Rajdhani, sans-serif;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 15px 30px;
        }

        p {
            font-size: 1rem;
            margin: 0;
            opacity: 0.8;
            line-height: 1.4;
            font-weight: 300;
        }
    }

    .coming-soon-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: linear-gradient(45deg, #ff6b35, #ff9500);
        color: white;
        padding: 5px 12px;
        border-radius: 15px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        z-index: 2;
    }
    &:hover {
        transform: translateY(-3px);
        transition: background-color 0.1s linear 0s;
        background-color: rgba(255, 255, 255, 0.4);
        :deep(.panel) {
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow:
                -1px 0 0 rgba(0, 0, 0, 0.3),
                1px 0 0 rgba(0, 0, 0, 0.3),
                0 1px 0 rgba(0, 0, 0, 0.3),
                0 -1px 0 rgba(0, 0, 0, 0.3),
                inset 0 0 50px rgba(255, 255, 255, 0.2),
                inset 0 3px 8px rgba(255, 255, 255, 0.15),
                5px 10px 20px rgba(0, 0, 0, 0.9);
        }

        .card-content h2 {
            text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
    }

    &.coming-soon {
        .card-content {
            opacity: 0.7;
        }

        :deep(.panel) {
            background: linear-gradient(rgba(50, 30, 30, 0.5), rgba(40, 20, 20, 0.3), rgba(50, 30, 30, 0.6));
        }

        &:hover {
            .card-content h2 {
                color: #ff9500;
                text-shadow: 0 0 10px rgba(255, 149, 0, 0.5);
            }
        }
    }

    // Ensure Panel component fills the card
    :deep(.panel) {
        height: 100%;
        display: flex;
        flex-direction: column;

        .content {
            height: 100%;
        }
    }
}

@media (max-width: 1200px) {
    .game-modes-grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(3, 1fr);

        .game-mode-card.wide {
            grid-column: span 1;
        }
    }

    .game-mode-card .card-content h2 {
        font-size: 1.6rem;
    }
}

@media (max-width: 768px) {
    .game-menu-container {
        padding: 20px;
    }

    .game-modes-grid {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(6, minmax(150px, auto));
        gap: 15px;

        .game-mode-card.wide {
            grid-column: span 1;
        }
    }

    .game-mode-card {
        min-height: 150px;

        .card-content h2 {
            font-size: 1.4rem;
        }

        .card-content p {
            font-size: 0.9rem;
        }

        :deep(.panel .content) {
            padding: 20px;
        }
    }
}
</style>
