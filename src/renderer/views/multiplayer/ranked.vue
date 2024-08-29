<route lang="json5">
{ meta: { title: "Ranked", order: 0, devOnly: true, availableOffline: false, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>Ranked Matchmaking</h1>

        {{ queueing }}

        <div class="playlists">
            <div
                v-for="playlist in playlists"
                :key="playlist.id"
                class="playlist"
                :class="{ selected: selectedPlaylistIds.has(playlist.id) }"
                @click="toggleCheck(playlist.id)"
            >
                <div>{{ playlist.name }}</div>
                <div>Ranked: {{ playlist.ranked }}</div>
            </div>
        </div>

        <Button :disabled="selectedPlaylistIds.size === 0 || queueing" @click="queue">Queue</Button>
    </div>
</template>

<script lang="ts" setup>
// - Matchmaking queue toggles for 1v1, 2v2, 3v3, 4v4, 5v5, 6v6, 7v7, 8v8, Small FFA (3 - 5), Medium FFA (6 - 10), Large FFA (11 - 16), TeamFFA
// - Show current rank for each playlist
// - Big shiny queue button, changes to cancel queue when queued already
// - Ready modal popup when match is found, shows status like 9/10 players ready

// Ranked differences:

// - New ranking system that makes more sense for ranked games, publicly visible
// - No spectators
// - Can't resign individually but can 'abandon' which incurs a penalty
// - Team surrender only possible after x time and requires team approval (80%?)
// - Player being AFK for more than x minutes counts as abandon
// - Players who abandon are punished in some way, lower reputation, banned from matchmaking for x time or something

import { MatchmakingListOkResponseData } from "tachyon-protocol/types";
import { reactive, ref } from "vue";

import Button from "@/components/controls/Button.vue";

type MatchmatchPlaylist = MatchmakingListOkResponseData["playlists"][0] & {
    checked?: boolean;
};

const playlists = reactive<MatchmatchPlaylist[]>([]);
const selectedPlaylistIds = reactive<Set<string>>(new Set());
const queueing = ref(false);

const listResponse = await api.comms.request("matchmaking/list");

if (listResponse.status === "success") {
    playlists.length = 0;
    playlists.push(...listResponse.data.playlists);
}

function toggleCheck(playlistId: string) {
    if (selectedPlaylistIds.has(playlistId)) {
        selectedPlaylistIds.delete(playlistId);
    } else {
        selectedPlaylistIds.add(playlistId);
    }
}

async function queue() {
    const playlistIds = Array.from(selectedPlaylistIds) as [string, ...string[]];

    const queueResponse = await api.comms.request("matchmaking/queue", { queues: playlistIds });

    queueing.value = queueResponse.status === "success";
}
</script>

<style lang="scss" scoped>
.playlists {
}
.playlist {
    width: 200px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 5px;
    &.selected {
        background-color: green;
    }
}
</style>
