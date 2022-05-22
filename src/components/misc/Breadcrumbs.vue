<!-- Currently unused because not enough page depth to warrant it -->

<template>
    <div class="breadcrumbs">
        <router-link to="/" class="back">
            <Icon icon="arrow-left-bold" />
            <div>Back</div>
        </router-link>
        <router-link v-for="(thisRoute, index) in route.matched" :key="index" :to="thisRoute.path">
            {{ thisRoute.meta.title || thisRoute.meta.name || thisRoute.path }}
        </router-link>
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

import Icon from "@/components/common/Icon.vue";

const route = useRoute();
</script>

<style lang="scss" scoped>
.breadcrumbs {
    display: flex;
    gap: 20px;
    .back {
        display: flex;
        gap: 5px;
    }
}
</style>
