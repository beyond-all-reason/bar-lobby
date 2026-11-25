<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!--
One mission, scenario or tutorial as its own card, to play or continue, and with pass and fail buttons standing in for its result.
A mission the player can't start now is still shown, greyed out, so the whole of a campaign can be seen
while its data is being worked on. Dev mode can choose the engine and game it launches with.
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
            <template v-if="settingsStore.devMode && launch">
                <Select
                    :modelValue="versions?.engineVersion ?? AUTOMATIC"
                    :options="engineOptions"
                    optionLabel="label"
                    optionValue="id"
                    label="Engine"
                    :filter="true"
                    @update:model-value="(engineVersion: string) => choose({ engineVersion })"
                />
                <Select
                    :modelValue="versions?.gameVersion ?? AUTOMATIC"
                    :options="gameOptions"
                    optionLabel="label"
                    optionValue="id"
                    label="Game"
                    :filter="true"
                    @update:model-value="(gameVersion: string) => choose({ gameVersion })"
                />
            </template>
            <div v-if="suspended" class="flex-col gap-sm suspended">
                <span>{{ t("lobby.singleplayer.content.suspended.savedAt", { date: new Date(suspended.savedAt).toLocaleString() }) }}</span>
                <template v-if="suspended.unusable">
                    <span>{{ t(suspendedUnusableText(suspended.unusable)) }}</span>
                    <div class="flex-row gap-sm">
                        <Button class="red" :disabled="launching" @click="removeSuspended">{{
                            t("lobby.singleplayer.content.suspended.delete")
                        }}</Button>
                    </div>
                </template>
            </div>
            <div v-if="confirmingDiscard" class="flex-col gap-sm">
                <span>{{ t("lobby.singleplayer.content.suspended.discardWarning") }}</span>
                <div class="flex-row gap-sm">
                    <Button class="red" @click="play">{{ t("lobby.singleplayer.content.suspended.playFromStart") }}</Button>
                    <Button @click="confirmingDiscard = false">{{ t("lobby.singleplayer.content.suspended.cancel") }}</Button>
                </div>
            </div>
            <div class="flex-row gap-sm flex-center-items actions">
                <span v-if="status.completed" class="completed">{{ t("lobby.singleplayer.content.completed") }}</span>
                <Button
                    v-if="continueLaunch && suspended && !suspended.unusable"
                    class="blue"
                    :disabled="!!unplayable || launching"
                    @click="run(continueLaunch)"
                    >{{ t("lobby.singleplayer.content.suspended.continue") }}</Button
                >
                <Button
                    v-if="launch"
                    class="blue"
                    :disabled="!status.available || blocked || launching || confirmingDiscard"
                    @click="askToPlay"
                    >{{ launching ? t("lobby.singleplayer.content.launching") : t("lobby.singleplayer.content.play") }}</Button
                >
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
import { computed, type DeepReadonly, ref } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import UnplayableNote from "@renderer/components/singleplayer/UnplayableNote.vue";
import { type TranslationKey, useTypedI18n } from "@renderer/i18n";
import { singleplayerLogic, type UnplayableReason } from "@renderer/logic/singleplayer";
import { installedEngineVersions } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { settingsStore } from "@renderer/store/settings.store";
import type { MissionStatus } from "@shared/content/campaign-progress";
import type { ChosenVersions } from "@shared/content/singleplayer";
import type { SuspendedMission } from "@shared/content/suspended-mission";

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
    // The engine and game dev mode chose to launch it with.
    versions?: ChosenVersions;
    // This mission's game, saved in game and left part way.
    suspended?: DeepReadonly<SuspendedMission>;
    // Whether playing from the start discards a saved game of the item, this mission's or another of the campaign's.
    discardsSuspended?: boolean;
    // Continues the suspended game, giving back why it didn't start if it didn't.
    continueLaunch?: () => Promise<TranslationKey | undefined>;
    // Deletes the suspended game, giving back why it wasn't deleted if it wasn't.
    deleteSuspended?: () => Promise<TranslationKey | undefined>;
}>();

const emit = defineEmits<{
    pass: [];
    fail: [];
    "update:versions": [versions: ChosenVersions];
}>();

// Leaves the choice to the launch, which picks as it would outside dev mode. For developers only, so in English.
const AUTOMATIC = "";
const optionsOf = (versions: string[]) => [{ id: AUTOMATIC, label: "Automatic" }, ...versions.map((id) => ({ id, label: id }))];
const engineOptions = computed(() => optionsOf(installedEngineVersions.value.map((engine) => engine.id)));
const gameOptions = computed(() => optionsOf([...gameStore.availableGameVersions.keys()]));

function choose(change: ChosenVersions) {
    const versions = { ...props.versions, ...change };
    emit("update:versions", {
        engineVersion: versions.engineVersion === AUTOMATIC ? undefined : versions.engineVersion,
        gameVersion: versions.gameVersion === AUTOMATIC ? undefined : versions.gameVersion,
    });
}

// A chosen engine or game is used whatever the item accepts, so only its other reasons keep it from starting.
const blocked = computed(() => {
    const chosen = settingsStore.devMode && (props.versions?.engineVersion !== undefined || props.versions?.gameVersion !== undefined);

    return !!props.unplayable && !(chosen && "compatibility" in props.unplayable);
});

const { suspendedUnusableText } = singleplayerLogic;

const launching = ref(false);
const launchError = ref<TranslationKey>();
const confirmingDiscard = ref(false);

async function run(start: (() => Promise<TranslationKey | undefined>) | undefined) {
    launching.value = true;
    confirmingDiscard.value = false;
    launchError.value = undefined;
    try {
        launchError.value = await start?.();
    } finally {
        launching.value = false;
    }
}

function play() {
    return run(props.launch);
}

function askToPlay() {
    if (props.discardsSuspended) {
        confirmingDiscard.value = true;
    } else {
        void play();
    }
}

function removeSuspended() {
    return run(props.deleteSuspended);
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

.suspended {
    font-style: italic;
}
</style>
