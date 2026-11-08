<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!--
One mission, scenario or tutorial as its own card, to play, and with pass and fail buttons standing in for its result.
A mission the player can't start now is still shown, greyed out, so the whole of a campaign can be seen
while its data is being worked on.
-->
<template>
    <Panel
        class="mission-card"
        :class="{ disabled: !status.available, unplayable }"
        :style="backgroundImageUrl ? { backgroundImage: `url('${backgroundImageUrl}')` } : {}"
    >
        <div class="flex-col gap-md fullheight">
            <img v-if="imageUrl" :src="imageUrl" class="mission-image" alt="" />
            <h3>{{ title }}</h3>
            <p v-if="description">{{ description }}</p>
            <UnplayableNote v-if="unplayable" :reason="unplayable" />
            <code v-if="settingsStore.devMode" class="dev-status">{{ devStatus }}</code>
            <!-- Settings for playing it, such as its difficulty. -->
            <slot />
            <div class="flex-row gap-sm flex-center-items actions">
                <span v-if="status.completed" class="completed">{{ t("lobby.singleplayer.content.completed") }}</span>
                <Button v-if="launch" class="blue" :disabled="!status.available || !!unplayable || launching" @click="play">{{
                    launching ? t("lobby.singleplayer.content.launching") : t("lobby.singleplayer.content.play")
                }}</Button>
                <Button class="green" :disabled="!status.available" @click="emit('pass')">{{
                    t("lobby.singleplayer.content.pass")
                }}</Button>
                <Button class="red" :disabled="!status.available" @click="emit('fail')">{{ t("lobby.singleplayer.content.fail") }}</Button>
            </div>
            <p v-if="launchError" class="launch-error">{{ t(launchError) }}</p>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import UnplayableNote from "@renderer/components/singleplayer/UnplayableNote.vue";
import { type TranslationKey, useTypedI18n } from "@renderer/i18n";
import type { UnplayableReason } from "@renderer/logic/singleplayer";
import { settingsStore } from "@renderer/store/settings.store";
import type { MissionStatus } from "@shared/content/campaign-progress";

const { t } = useTypedI18n();

const props = defineProps<{
    title: string;
    description?: string;
    imageUrl?: string;
    // Fills the whole card, behind its content.
    backgroundImageUrl?: string;
    status: MissionStatus;
    // Why this install can't play it, if it can't. Pass and fail still work, for testing.
    unplayable?: UnplayableReason;
    // Starts it, giving back why it didn't start if it didn't. Without it, there is no Play button.
    launch?: () => Promise<TranslationKey | undefined>;
}>();

const emit = defineEmits<{
    pass: [];
    fail: [];
}>();

const launching = ref(false);
const launchError = ref<TranslationKey>();

async function play() {
    launching.value = true;
    launchError.value = undefined;
    try {
        launchError.value = await props.launch?.();
    } finally {
        launching.value = false;
    }
}

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
.mission-card {
    background-size: cover;
    background-position: center;
    // Long single-word names, such as ids, break instead of widening the card past its grid column.
    overflow-wrap: anywhere;
    &.disabled {
        opacity: 0.4;
    }
    &.unplayable {
        filter: grayscale(1);
    }
}

.mission-image {
    max-width: 100%;
    max-height: 120px;
    object-fit: contain;
}

.dev-status {
    opacity: 0.7;
}

// Kept at the bottom, so the buttons line up across cards of different heights.
.actions {
    margin-top: auto;
}

.completed {
    font-weight: bold;
}

.launch-error {
    font-weight: bold;
}
</style>
