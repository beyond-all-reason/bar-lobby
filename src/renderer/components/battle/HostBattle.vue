<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.components.battle.hostBattle.title')" width="400px" @open="onOpen" @close="onClose">
        <div class="flex-col gap-md">
            <template v-if="waitingForBattleCreation">
                <div class="txt-center">{{ t("lobby.components.battle.hostBattle.settingUp") }}</div>
                <Loader :absolutePosition="false"></Loader>
            </template>
            <template v-else>
                <Textbox
                    v-model="lobbyName"
                    :label="t('lobby.components.battle.hostBattle.lobbyName')"
                    placeholder="My Custom Battle"
                    class="fullwidth"
                />
                <div v-if="error" class="error-message">{{ error }}</div>
                <Button class="blue" @click="hostBattle" :disabled="!canHost">{{ t("lobby.components.battle.hostBattle.hostButton") }}</Button>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";

import Loader from "@renderer/components/common/Loader.vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { lobbyActions } from "@renderer/store/lobby.store";

const { t } = useTypedI18n();
const router = useRouter();

const lobbyName = ref("My Custom Battle");
const selectedMap = ref("Supreme Crossing V1");  // Default to a common map
const waitingForBattleCreation = ref(false);
const error = ref("");

const canHost = computed(() => lobbyName.value.trim().length > 0);

async function hostBattle() {
    if (!canHost.value) return;

    waitingForBattleCreation.value = true;
    error.value = "";

    try {
        // Create a simple 2-team setup (Team 1 vs Team 2)
        // Each ally team has 1 team with max 8 players
        const response = await window.tachyon.request("lobby/create", {
            name: lobbyName.value,
            mapName: selectedMap.value,
            allyTeamConfig: [
                {
                    maxTeams: 1,
                    startBox: { xMin: 0, yMin: 0, xMax: 0.4, yMax: 1 },
                    teams: [{ maxPlayers: 8 }],
                },
                {
                    maxTeams: 1,
                    startBox: { xMin: 0.6, yMin: 0, xMax: 1, yMax: 1 },
                    teams: [{ maxPlayers: 8 }],
                },
            ],
        });

        if (response.status === "success") {
            // Store the lobby details
            await lobbyActions.joinLobby(response.data.id);

            // Navigate to the lobby view
            await router.push(`/play/custom-lobby/${response.data.id}`);

            // Close the modal
            emit("update:modelValue", false);
        }
    } catch (err) {
        console.error("Failed to create lobby:", err);
        error.value = err instanceof Error ? err.message : String(err);
    } finally {
        waitingForBattleCreation.value = false;
    }
}

function onOpen() {
    waitingForBattleCreation.value = false;
    error.value = "";
}

function onClose() {
    error.value = "";
}

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
}>();
</script>

<style lang="scss" scoped>
.error-message {
    color: var(--color-error);
    font-size: 0.9em;
    padding: 8px;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
}
</style>
