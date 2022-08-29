<route lang="json">
{ "meta": { "title": "Overview", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div class="flex-col">
        <div class="flex-row gap-lg">
            <Flag :countryCode="user.countryCode" style="width: 50px" />
            <h1>{{ user.username }}</h1>
        </div>

        {{ user.icons }}
    </div>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * - Player name
 * - Avatar - Steam or choose from BAR selection?
 * - Profile level (fancy banner associated with level?)
 * - Ranks in each playlist
 * - Simple stats - games played, favourite faction, favourite mode
 * - Recent achievements unlocked
 * - Recent activity/matches
 */

import Flag from "@/components/misc/Flag.vue";

const user = api.session.onlineUser;
</script>

<style lang="scss" scoped></style>
