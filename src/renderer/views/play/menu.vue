<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Menu", order: 0, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="game-menu-container">
            <div class="game-modes-grid">
                <Panel class="game-mode-card large" @click="startSkirmish">
                    <div class="card-content">
                        <h2>Skirmish vs AI</h2>
                        <p>Battle against AI opponents on custom maps</p>
                    </div>
                </Panel>

                <Panel class="game-mode-card large coming-soon" @click="startCampaign">
                    <div class="card-content">
                        <h2>Campaign</h2>
                        <p>Experience epic single-player missions</p>
                        <div class="coming-soon-badge">Coming Soon</div>
                    </div>
                </Panel>

                <Panel class="game-mode-card large" @click="startMatchmaking">
                    <div class="card-content">
                        <h2>Matchmaking</h2>
                        <p>Ranked battles with skill-based matching</p>
                    </div>
                </Panel>

                <Panel class="game-mode-card large" @click="startCustomLobbies">
                    <div class="card-content">
                        <h2>Custom Lobbies</h2>
                        <p>Join community-hosted battle rooms</p>
                    </div>
                </Panel>

                <Panel class="game-mode-card wide" @click="openScenarios">
                    <div class="card-content">
                        <h2>Scenarios</h2>
                        <p>Special challenge missions and cooperative battles</p>
                    </div>
                </Panel>

                <Panel class="game-mode-card wide" @click="openTournaments">
                    <div class="card-content">
                        <h2>Tournaments</h2>
                        <p>Competitive events and community competitions</p>
                    </div>
                </Panel>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Panel from "@renderer/components/common/Panel.vue";

const router = useRouter();

// Game mode handlers
const startSkirmish = () => {
    router.push("/play/skirmishVsAi");
};

const startCampaign = () => {
    router.push("/play/campaign");
};

const startMatchmaking = () => {
    router.push("/play/matchmaking");
};

const startCustomLobbies = () => {
    router.push("/play/customLobbies/customLobbies");
};

const openScenarios = () => {
    router.push("/play/scenarios");
};

const openTournaments = () => {
    router.push("/play/tournaments");
};
</script>

<style lang="scss" scoped>
.game-menu-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    width: 100%;
    height: 100%;
    padding: 40px 60px;
}

.game-modes-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 20px;
    height: 100%;
    max-width: 1400px;
    margin: 0 auto;
    flex: 1;
}

.game-mode-card {
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    min-height: 200px;

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
            margin: 0 0 10px 0;
            color: white;
            font-family: Rajdhani, sans-serif;
            text-transform: uppercase;
            letter-spacing: 1px;
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
            color: #22c55e;
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
            padding: 30px;
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
