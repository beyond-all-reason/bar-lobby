<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- One campaign, tutorial group or scenario to pick. Layout only: what it shows is worked out by the view. -->
<template>
    <Panel
        class="content-tile"
        :class="{ selected, unplayable }"
        :style="backgroundImageUrl ? { backgroundImage: `url('${backgroundImageUrl}')` } : {}"
        @click="emit('select')"
    >
        <div class="flex-col gap-md">
            <img v-if="imageUrl" :src="imageUrl" class="tile-image" alt="" />
            <h3>{{ title }}</h3>
            <p v-if="description">{{ description }}</p>
            <UnplayableNote v-if="unplayable" :reason="unplayable" />
            <div v-if="completed" class="completed">{{ t("lobby.singleplayer.content.completed") }}</div>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import UnplayableNote from "@renderer/components/singleplayer/UnplayableNote.vue";
import { useTypedI18n } from "@renderer/i18n";
import type { UnplayableReason } from "@renderer/logic/singleplayer";

const { t } = useTypedI18n();

defineProps<{
    title: string;
    description?: string;
    imageUrl?: string;
    // Fills the whole tile, behind its content.
    backgroundImageUrl?: string;
    completed: boolean;
    selected?: boolean;
    // Why this install can't play it, if it can't. It stays selectable.
    unplayable?: UnplayableReason;
}>();

const emit = defineEmits<{
    select: [];
}>();
</script>

<style lang="scss" scoped>
.content-tile {
    cursor: pointer;
    background-size: cover;
    background-position: center;
    // Long single-word names, such as ids, break instead of widening the tile past its grid column.
    overflow-wrap: anywhere;
    &.unplayable {
        filter: grayscale(1);
        opacity: 0.6;
    }
    &.selected {
        outline: 1px solid rgba(255, 255, 255, 0.6);
        // Drawn inside the tile, so a scroll container's edge doesn't clip it.
        outline-offset: -1px;
    }
}

.tile-image {
    max-width: 100%;
    max-height: 120px;
    object-fit: contain;
}

.completed {
    font-weight: bold;
}
</style>
