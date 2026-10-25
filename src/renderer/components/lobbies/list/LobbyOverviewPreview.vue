<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <!-- Teleported so the page transition's transform can't offset position: fixed. -->
    <Teleport to="body">
        <div ref="box" class="lobby-overview-preview" :class="{ active: isActiveLobby }" :style="position">
            <div class="content flex-row gap-md">
                <div class="map-column flex-col gap-xs">
                    <div class="map-frame">
                        <MapSimplePreview :map="map" :class="{ dim: lobby.currentBattle }" />
                        <ActiveBattleVideo v-if="lobby.currentBattle" class="battle-video" />
                    </div>
                    <div class="map-name">{{ mapName }}</div>
                </div>
                <div class="info-column flex-col gap-sm">
                    <div class="full-title">{{ lobby.name }}</div>
                    <div v-if="membershipLabel" class="info-line membership flex-row flex-center-items gap-sm">
                        <Icon :icon="membershipIcon" :height="20" class="line-icon" />
                        <span>{{ membershipLabel }}</span>
                    </div>
                    <div class="info-line flex-row flex-center-items gap-sm">
                        <Icon :icon="accountIcon" :height="20" class="line-icon" />
                        <span>{{
                            t("lobby.multiplayer.custom.preview.players", { players: lobby.playerCount, max: lobby.maxPlayerCount })
                        }}</span>
                        <span class="secondary">{{ t("lobby.multiplayer.custom.preview.openSpots", { count: openSpots(lobby) }) }}</span>
                    </div>
                    <div class="info-line flex-row flex-center-items gap-sm">
                        <Icon :icon="lobby.currentBattle ? swordCrossIcon : clockIcon" :height="20" class="line-icon" />
                        <span v-if="battleDurationMs !== null">
                            {{ t("lobby.multiplayer.custom.preview.inBattle", { duration: getFriendlyDuration(battleDurationMs) }) }}
                        </span>
                        <span v-else>{{ t("lobby.multiplayer.custom.preview.waiting") }}</span>
                    </div>
                    <div v-if="lobby.allyTeamCount" class="info-line flex-row flex-center-items gap-sm">
                        <Icon :icon="accountGroupIcon" :height="20" class="line-icon" />
                        <span>{{ t("lobby.multiplayer.custom.preview.allyTeams", lobby.allyTeamCount) }}</span>
                    </div>
                    <div v-if="friendCount" class="info-line flex-row flex-center-items gap-sm">
                        <Icon :icon="accountHeartIcon" :height="20" class="line-icon" />
                        <span>{{ t("lobby.multiplayer.custom.preview.friends", friendCount) }}</span>
                    </div>
                    <div v-if="lobby.passworded" class="info-line flex-row flex-center-items gap-sm">
                        <Icon :icon="lockIcon" :height="20" class="line-icon" />
                        <span>{{ t("lobby.multiplayer.custom.preview.passworded") }}</span>
                    </div>
                    <div v-if="lobby.bossMode" class="info-line flex-row flex-center-items gap-sm">
                        <Icon :icon="hammerIcon" :height="20" class="line-icon" />
                        <span>{{ t("lobby.multiplayer.custom.preview.bossMode") }}</span>
                    </div>
                    <div v-if="lobby.tags?.length" class="tags flex-row flex-center-items gap-xs">
                        <Icon :icon="tagIcon" :height="18" class="line-icon" />
                        <span v-for="tag in lobby.tags" :key="tag" class="tag">{{ tag }}</span>
                    </div>
                    <div class="versions flex-col">
                        <span>{{ t("lobby.multiplayer.custom.preview.gameVersion", { version: lobby.gameVersion }) }}</span>
                        <span>{{ t("lobby.multiplayer.custom.preview.engineVersion", { version: lobby.engineVersion }) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import accountIcon from "@iconify-icons/mdi/account";
import accountGroupIcon from "@iconify-icons/mdi/account-group";
import accountHeartIcon from "@iconify-icons/mdi/account-heart";
import clockIcon from "@iconify-icons/mdi/clock-outline";
import eyeIcon from "@iconify-icons/mdi/eye";
import hammerIcon from "@iconify-icons/mdi/hammer";
import humanQueueIcon from "@iconify-icons/mdi/human-queue";
import lockIcon from "@iconify-icons/mdi/lock";
import swordCrossIcon from "@iconify-icons/mdi/sword-cross";
import tagIcon from "@iconify-icons/mdi/tag-outline";
import { useElementBounding, useNow, useWindowSize } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import MapSimplePreview from "@renderer/components/maps/MapSimplePreview.vue";
import ActiveBattleVideo from "@renderer/components/misc/ActiveBattleVideo.vue";
import { openSpots } from "@renderer/logic/lobby-list/filters";
import { useActiveLobbyStatus } from "@renderer/composables/useActiveLobbyStatus";
import { useLobbyMap } from "@renderer/composables/useLobbyMap";
import type { LobbyListEntry } from "@renderer/model/lobby-list";
import { lobbyStore } from "@renderer/store/lobby.store";
import { me } from "@renderer/store/me.store";
import { useTypedI18n } from "@renderer/i18n";
import { getFriendlyDuration } from "@renderer/utils/misc";

const props = defineProps<{
    lobby: LobbyListEntry;
    anchor: { top: number; bottom: number };
    x: number;
}>();

const { t } = useTypedI18n();

const map = useLobbyMap(() => props.lobby.mapName);
const mapName = computed(() => map.value?.displayName || props.lobby.mapName);

const now = useNow({ interval: 1000 });
const battleDurationMs = computed(() => {
    const startedAt = props.lobby.currentBattle?.startedAt;
    if (startedAt === undefined) return null;
    return Math.max(0, now.value.getTime() - startedAt / 1000);
});

const friendCount = computed(() => props.lobby.memberIds?.filter((id) => me.friendUserIds.has(id)).length ?? 0);

const { role, queuePosition } = useActiveLobbyStatus();
const isActiveLobby = computed(() => lobbyStore.activeLobby?.id === props.lobby.id);

const membershipIcon = computed(() => {
    switch (role.value) {
        case "player":
            return swordCrossIcon;
        case "queued":
            return humanQueueIcon;
        default:
            return eyeIcon;
    }
});

const membershipLabel = computed(() => {
    if (!isActiveLobby.value) return "";
    switch (role.value) {
        case "player":
            return t("lobby.multiplayer.custom.preview.membershipPlayer");
        case "spectator":
            return t("lobby.multiplayer.custom.preview.membershipSpectator");
        case "queued":
            return queuePosition.value !== null
                ? t("lobby.multiplayer.custom.preview.membershipQueued", { position: queuePosition.value })
                : t("lobby.multiplayer.custom.preview.membershipSpectator");
        default:
            return t("lobby.multiplayer.custom.preview.membership");
    }
});

const GAP = 4;
const EDGE_MARGIN = 8;
const POINTER_INSET = 24;

const box = useTemplateRef<HTMLElement>("box");
const { width, height } = useElementBounding(box);
const { width: windowWidth, height: windowHeight } = useWindowSize();

const position = computed(() => {
    // Hidden until measured to avoid a frame on the wrong side of the row.
    if (!width.value) return { visibility: "hidden" as const };
    let top = props.anchor.bottom + GAP;
    const above = props.anchor.top - GAP - height.value;
    if (top + height.value > windowHeight.value - EDGE_MARGIN && above >= EDGE_MARGIN) top = above;
    const maxLeft = windowWidth.value - width.value - EDGE_MARGIN;
    const left = Math.max(EDGE_MARGIN, Math.min(props.x - POINTER_INSET, maxLeft));
    return { left: `${left}px`, top: `${top}px` };
});
</script>

<style lang="scss" scoped>
.lobby-overview-preview {
    position: fixed;
    z-index: 10;
    width: 440px;
    pointer-events: none;
    font-family: Rajdhani, sans-serif;
    background: linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.9));
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.6);
    &:before {
        position: absolute;
        inset: 0;
        content: "";
        z-index: -1;
        opacity: 0.2;
        background-image: url("/src/renderer/assets/images/squares.png");
    }
    &.active {
        border-color: gold;
        box-shadow:
            0 3px 12px rgba(0, 0, 0, 0.6),
            0 0 8px rgba(255, 215, 0, 0.35);
    }
}
.content {
    position: relative;
    padding: 10px 12px;
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
.info-line {
    font-size: 17px;
    opacity: 0.9;
}
.membership {
    color: gold;
    font-weight: 600;
    opacity: 1;
}
.line-icon {
    flex-shrink: 0;
}
.secondary {
    opacity: 0.7;
}
.tags {
    flex-wrap: wrap;
    font-size: 14px;
}
.tag {
    padding: 0 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.15);
}
.versions {
    font-size: 14px;
    opacity: 0.6;
    overflow-wrap: anywhere;
}
</style>
