<!--
TODO:
    - Player name
    - Avatar - Steam or choose from BAR selection?
    - Profile level (fancy banner associated with level?)
    - Ranks in each playlist
    - Simple stats - games played, favourite faction, favourite mode
    - Recent achievements unlocked
    - Recent activity/matches
-->

<route lang="json5">
{ props: true, meta: { title: "Profile", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div v-if="user">
        <h1 class="flex-row gap-lg">
            <Flag :countryCode="user.countryCode" style="width: 50px" />
            {{ user.username }}
        </h1>
        TODO
        <div>{{ user }}</div>
    </div>
    <div v-else>No user found with UserID: {{ props.id }}</div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Flag from "@/components/misc/Flag.vue";

const props = defineProps<{
    id: string;
}>();

const user = computed(() => api.session.getUserById(parseInt(props.id)));
</script>

<style lang="scss" scoped></style>
