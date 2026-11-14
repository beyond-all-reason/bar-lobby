<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="title" style="height: 50vh; width: 50vw; max-width: 1440px">
        <div class="scroll-container">
            <h3>{{ t("lobby.multiplayer.ranked.modal.labelName", { name: queueDetails?.name }) }}</h3>
            <p>
                {{
                    t("lobby.multiplayer.ranked.modal.labelTeamConfig", {
                        count: queueDetails?.teamSize,
                        numOfTeams: queueDetails?.numOfTeams,
                        teamSize: queueDetails?.teamSize,
                    })
                }}
            </p>
            <p>
                {{
                    t(queueDetails?.ranked ? "lobby.multiplayer.ranked.modal.labelRanked" : "lobby.multiplayer.ranked.modal.labelUnranked")
                }}
            </p>
            <h4>{{ t("lobby.multiplayer.ranked.modal.labelEngines", { count: queueDetails?.engines.length }) }}</h4>
            <div>
                <div v-for="(engine, index) in queueDetails?.engines" :key="index" class="hover-box padding-sm">
                    <Icon
                        :icon="checkIfNeeded('engines', engine.version) ? documentRemoveIcon : documentCheckIcon"
                        :class="checkIfNeeded('engines', engine.version) ? 'red-icon' : ''"
                    ></Icon
                    ><span class="padding-left-sm">{{ engine.version }}</span>
                </div>
            </div>
            <h4>{{ t("lobby.multiplayer.ranked.modal.labelGames", { count: queueDetails?.games.length }) }}</h4>
            <div>
                <div v-for="(game, index) in queueDetails?.games" :key="index" class="hover-box padding-sm">
                    <Icon
                        :icon="checkIfNeeded('games', game.springName) ? documentRemoveIcon : documentCheckIcon"
                        :class="checkIfNeeded('games', game.springName) ? 'red-icon' : ''"
                    ></Icon
                    ><span class="padding-left-sm">{{ game.springName }}</span>
                </div>
            </div>
            <h4>{{ t("lobby.multiplayer.ranked.modal.labelMaps", { count: queueDetails?.maps.length }) }}</h4>
            <div>
                <div
                    v-for="(map, index) in queueDetails?.maps"
                    :key="index"
                    class="hover-box padding-sm"
                    @click="onMapSelected(map.springName)"
                >
                    <Icon
                        :icon="checkIfNeeded('maps', map.springName) ? documentRemoveIcon : documentCheckIcon"
                        :class="checkIfNeeded('maps', map.springName) ? 'red-icon' : ''"
                    ></Icon
                    ><span class="padding-left-sm">{{ map.springName }}</span>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";
import Modal from "@renderer/components/common/Modal.vue";
import { matchmakingStore } from "@renderer/store/matchmaking.store";
import { Icon } from "@iconify/vue";
import documentRemoveIcon from "@iconify-icons/mdi/file-document-remove-outline";
import documentCheckIcon from "@iconify-icons/mdi/file-document-check-outline";

const router = useRouter();

const { t } = useTypedI18n();

const props = defineProps<{
    title: string;
    queue: string;
}>();

const emit = defineEmits(["closeModal"]);

const queueDetails = computed(() => {
    return matchmakingStore.playlists.find((q) => q.id === props.queue);
});

function checkIfNeeded(type: "engines" | "games" | "maps", id: string): boolean {
    return matchmakingStore.downloadsRequired[props.queue][type].includes(id);
}

async function onMapSelected(springName: string) {
    emit("closeModal");
    await router.push(`/library/maps/${springName}`);
}
</script>

<style lang="scss" scoped>
.hover-box:hover {
    background-color: rgba(255, 255, 255, 0.212);
}

.red-icon {
    color: red;
}
</style>
