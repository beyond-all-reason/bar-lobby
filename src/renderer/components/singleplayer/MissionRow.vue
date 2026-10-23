<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!--
One mission, scenario or tutorial with pass and fail buttons standing in for playing it. A mission the
player can't start now is still shown, greyed out, so the whole of a campaign can be seen while its data
is being worked on.
-->
<template>
    <div class="mission-row flex-row gap-md padding-md" :class="{ disabled: !status.available }">
        <img v-if="imageUrl" :src="imageUrl" class="mission-image" alt="" />
        <div class="flex-col flex-grow gap-sm">
            <h4>{{ title }}</h4>
            <p v-if="description">{{ description }}</p>
            <code v-if="settingsStore.devMode" class="dev-status">{{ devStatus }}</code>
        </div>
        <div class="flex-row gap-sm flex-center-items">
            <span v-if="status.completed">{{ t("lobby.singleplayer.content.completed") }}</span>
            <Button class="green" :disabled="!status.available" @click="emit('pass')">{{ t("lobby.singleplayer.content.pass") }}</Button>
            <Button class="red" :disabled="!status.available" @click="emit('fail')">{{ t("lobby.singleplayer.content.fail") }}</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Button from "@renderer/components/controls/Button.vue";
import { useTypedI18n } from "@renderer/i18n";
import { settingsStore } from "@renderer/store/settings.store";
import type { MissionStatus } from "@shared/content/campaign-progress";

const { t } = useTypedI18n();

const props = defineProps<{
    title: string;
    description?: string;
    imageUrl?: string;
    status: MissionStatus;
}>();

const emit = defineEmits<{
    pass: [];
    fail: [];
}>();

// For developers only, so it stays in English and names the state as the unlock rules see it.
const devStatus = computed(() => {
    const { available, completed, replayable, removed, start, final } = props.status;
    const state = completed
        ? `completed · ${replayable ? "replayable" : "not replayable"}`
        : removed
          ? "removed"
          : available
            ? "unlocked"
            : "locked";
    const tags = [start && "start", final && "final", removed && completed && "removed"].filter(Boolean);

    return [state, ...tags].join(" · ");
});
</script>

<style lang="scss" scoped>
.mission-row.disabled {
    opacity: 0.4;
}

.mission-image {
    max-height: 64px;
    object-fit: contain;
}

.dev-status {
    opacity: 0.7;
}
</style>
