<route lang="json5">
{ meta: { title: "Overview", order: 0, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col">
        <div class="flex-row gap-lg">
            <!-- <Flag :countryCode="user.countryCode" style="width: 50px" /> -->
            <h1>{{ userId }}</h1>
        </div>
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

// const user = api.session.onlineUser;

defineProps<{
    userId: number;
}>();
</script>

<style lang="scss" scoped></style>
