<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div v-if="lobby && !isOnLobbyView" class="active-lobby-preview" @click="openLobby">
        <div class="details">
            <div class="details-panel">
                <div class="details-content flex-row gap-md">
                    <div v-if="backgroundUrl" class="details-background" :style="{ backgroundImage: `url(${backgroundUrl})` }" />
                    <div class="map-column flex-col gap-xs">
                        <div class="map-frame">
                            <MapSimplePreview :map="map" :class="{ dim: lobby.currentBattle }" />
                            <ActiveBattleVideo v-if="lobby.currentBattle" class="battle-video" />
                        </div>
                        <div class="map-name">{{ mapName }}</div>
                    </div>
                    <div class="info-column flex-col gap-sm">
                        <div class="full-title">{{ lobby.name }}</div>
                        <div v-if="isBoss" class="info-line flex-row flex-center-items gap-sm">
                            <Icon :icon="hammerIcon" :height="20" class="line-icon boss-icon" />
                            <span>{{ t("lobby.components.battle.activeLobbyPreview.lobbyBoss") }}</span>
                        </div>
                        <!-- Groups sit side by side when there is room and wrap underneath each other when there isn't. -->
                        <div class="info-groups">
                            <div v-if="(roleIcon && roleLabel) || allyTeamConfigLabel" class="info-group flex-col gap-xs">
                                <div v-if="roleIcon && roleLabel" class="info-line flex-row flex-center-items gap-sm">
                                    <Icon :icon="roleIcon" :height="20" class="line-icon" />
                                    <span>{{ roleLabel }}</span>
                                </div>
                                <div v-if="allyTeamConfigLabel" class="info-line">{{ allyTeamConfigLabel }}</div>
                            </div>
                            <div v-if="vote || battleDurationMs !== null" class="info-group flex-col gap-xs">
                                <div v-if="vote" class="info-line">
                                    <strong>{{ t("lobby.components.battle.activeLobbyPreview.activeVote") }}</strong>
                                    {{ voteString }}
                                </div>
                                <div v-if="vote && voteTimeLeftMs !== null" class="info-line vote-time-left">
                                    {{
                                        t("lobby.components.battle.activeLobbyPreview.voteTimeLeft", {
                                            time: formatTimeLeft(voteTimeLeftMs),
                                        })
                                    }}
                                </div>
                                <div v-if="needsMyVote" class="info-line vote-prompt flashing flex-row flex-center-items gap-sm">
                                    <Icon :icon="voteIcon" :height="20" class="line-icon" />
                                    <span>{{ t("lobby.components.battle.activeLobbyPreview.clickToVote") }}</span>
                                </div>
                                <div v-if="battleDurationMs !== null" class="info-line">
                                    {{ t("lobby.components.battle.activeLobbyPreview.battleDuration") }}
                                    {{ getFriendlyDuration(battleDurationMs) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="summary flex-row gap-md" v-tooltip.top="t('lobby.components.battle.activeLobbyPreview.openLobby')">
            <div class="status-icons flex-row flex-center-items gap-xs">
                <Icon :icon="statusIcon" :height="24" :class="['status-icon', { flashing: needsMyVote }]" />
                <Icon v-if="isBoss" :icon="hammerIcon" :height="24" class="status-icon boss-icon" />
            </div>
            <div class="title flex-row gap-sm">
                <span class="lobby-name">{{ lobby.name }}</span>
                <span class="summary-map-name">{{ mapName }}</span>
            </div>
            <div class="player-count">{{ playerSummary }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import eyeIcon from "@iconify-icons/mdi/eye";
import hammerIcon from "@iconify-icons/mdi/hammer";
import humanQueueIcon from "@iconify-icons/mdi/human-queue";
import swordCrossIcon from "@iconify-icons/mdi/sword-cross";
import voteIcon from "@iconify-icons/mdi/vote";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";
import ActiveBattleVideo from "@renderer/components/misc/ActiveBattleVideo.vue";
import { useActiveLobbyStatus } from "@renderer/composables/useActiveLobbyStatus";
import { useLobbyBackground } from "@renderer/composables/useLobbyBackground";
import { useLobbyMap } from "@renderer/composables/useLobbyMap";
import { useVoteString } from "@renderer/composables/useVoteString";
import { getFriendlyDuration } from "@renderer/utils/misc";

const { t } = useTypedI18n();
const route = useRoute();
const router = useRouter();

const {
    lobby,
    role,
    isBoss,
    teamNumber,
    queuePosition,
    allyTeamSizes,
    vote,
    hasVote,
    needsMyVote,
    voteTimeLeftMs,
    playerSummary,
    battleDurationMs,
} = useActiveLobbyStatus();

// Round up so the countdown only reads 0s once the vote has actually expired.
function formatTimeLeft(ms: number) {
    const seconds = Math.ceil(ms / 1000);
    return seconds > 0 ? getFriendlyDuration(seconds * 1000) : "0s";
}
const { getVoteString } = useVoteString();
const voteString = computed(() => getVoteString(vote.value?.action));

const map = useLobbyMap();
const backgroundUrl = useLobbyBackground();

const isOnLobbyView = computed(() => route.path === "/play/lobby");

const mapName = computed(() => map.value?.displayName || lobby.value?.mapName || "");

const roleIcon = computed(() => {
    switch (role.value) {
        case "player":
            return swordCrossIcon;
        case "queued":
            return humanQueueIcon;
        case "spectator":
            return eyeIcon;
        default:
            return null;
    }
});

const statusIcon = computed(() => (hasVote.value ? voteIcon : (roleIcon.value ?? eyeIcon)));

const roleLabel = computed(() => {
    switch (role.value) {
        case "player":
            return teamNumber.value !== null ? t("lobby.components.battle.activeLobbyPreview.teamMember", { team: teamNumber.value }) : "";
        case "queued":
            return queuePosition.value !== null
                ? t("lobby.components.battle.activeLobbyPreview.queuePosition", { position: queuePosition.value })
                : "";
        case "spectator":
            return t("lobby.components.battle.activeLobbyPreview.spectating");
        default:
            return "";
    }
});

const allyTeamConfigLabel = computed(() => {
    const sizes = allyTeamSizes.value;
    if (sizes.length === 0) return "";
    if (sizes.every((size) => size === sizes[0])) {
        return t("lobby.components.battle.activeLobbyPreview.allyTeamConfig", {
            count: sizes[0],
            numOfTeams: sizes.length,
            teamSize: sizes[0],
        });
    }
    return t("lobby.components.battle.activeLobbyPreview.allyTeamConfigUneven", {
        numOfTeams: sizes.length,
        sizes: sizes.join(" / "),
    });
});

function openLobby() {
    router.push("/play/lobby");
}
</script>

<style lang="scss" scoped>
.active-lobby-preview {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 30vw;
    min-width: 320px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    font-family: Rajdhani, sans-serif;
    box-shadow: 0 -3px 8px rgba(0, 0, 0, 0.5);
    &:hover {
        .details-panel {
            transform: translateY(0);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .summary {
            border-color: rgba(255, 255, 255, 0.3);
            border-top-color: transparent;
            box-shadow: inset 0 0 0 999px rgba(255, 255, 255, 0.05);
        }
    }
}

// Shared look of the details panel and summary row, which together read as one box when expanded.
%preview-surface {
    position: relative;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-bottom: none;
    &:before {
        @extend .fullsize;
        left: 0;
        top: 0;
        content: "";
        z-index: -1;
        opacity: 0.2;
        background-image: url("/src/renderer/assets/images/squares.png");
        pointer-events: none;
    }
}

// Clips the panel at the summary's top edge, so it appears to slide out from behind it. The panel keeps its full
// size and only moves via transform, which the compositor can animate without repainting the background image.
.details {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    overflow: hidden;
    pointer-events: none;
}
.details-panel {
    @extend %preview-surface;
    background: linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.8));
    transform: translateY(100%);
    transition:
        transform 0.25s ease-out,
        border-color 0.25s;
    will-change: transform;
    pointer-events: auto;
}
// Fades out toward the left along a "/" edge (60° from horizontal) so it stays clear of the map and text.
// Sized to the content rather than the animated clip box, so it slides up intact instead of resizing mid-transition.
.details-background {
    position: absolute;
    inset: 0;
    z-index: -1;
    background-size: cover;
    background-position: right center;
    opacity: 0.5;
    mask-image: linear-gradient(120deg, transparent 35%, black 80%);
    pointer-events: none;
}
.details-content {
    position: relative;
    // Own stacking context keeps the background's z-index: -1 behind the content but above the preview's backdrop.
    isolation: isolate;
    padding: 10px 12px 6px;
}

.map-column {
    flex-shrink: 0;
    width: 120px;
}
.map-frame {
    position: relative;
    width: 120px;
    height: 120px;
}
.battle-video {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    transform: translateY(-50%);
    // Clicking the preview opens the lobby rather than rejoining, so the "Rejoin" caption would be misleading here.
    :deep(.rejoin-label) {
        display: none;
    }
}
.dim {
    filter: brightness(0.3);
}
.map-name {
    font-size: 16px;
    text-align: center;
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.info-column {
    min-width: 0;
    flex-grow: 1;
}
.full-title {
    font-size: 21px;
    font-weight: 600;
    overflow-wrap: anywhere;
}
.info-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 20px;
}
// The basis decides when the second group wraps below the first instead of sitting beside it.
.info-group {
    flex: 1 1 170px;
    min-width: 0;
}
.info-line {
    font-size: 17px;
    opacity: 0.9;
}
.vote-time-left {
    font-variant-numeric: tabular-nums;
}
// Flashes in step with the summary's vote icon, so the prompt reads as the explanation for it.
.vote-prompt {
    font-weight: 600;
}

.summary {
    @extend %preview-surface;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9));
    transition:
        box-shadow 0.2s,
        border-color 0.25s;
}
.status-icons,
.status-icon {
    flex-shrink: 0;
}
.boss-icon {
    color: gold;
}
.title {
    flex: 1;
    min-width: 0;
    justify-content: center;
    align-items: baseline;
    white-space: nowrap;
    > span {
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
.lobby-name {
    flex-shrink: 1;
}
// The lobby name gets priority; the map name gives up space first.
.summary-map-name {
    flex-shrink: 3;
    font-size: 15px;
    font-weight: 500;
    opacity: 0.6;
}
.line-icon {
    flex-shrink: 0;
}
.player-count {
    flex-shrink: 0;
    opacity: 0.9;
}

.flashing {
    animation: vote-flash 1s ease-in-out infinite;
}
@keyframes vote-flash {
    0%,
    100% {
        opacity: 1;
        color: rgb(255, 215, 80);
        filter: drop-shadow(0 0 6px rgba(255, 215, 80, 0.9));
    }
    50% {
        opacity: 0.35;
        color: #fff;
        filter: none;
    }
}
</style>
