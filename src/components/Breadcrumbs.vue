<!-- Currently unused because not enough page depth to warrant it -->

<template>
    <div class="breadcrumbs">
        <router-link to="/" class="back">
            <Icon icon="arrow-left-bold" />
            <div>Back</div>
        </router-link>
        <router-link v-for="(route, index) in route.matched" :key="index" :to="route.path">
            {{ route.meta.title || route.meta.name || route.path }}
        </router-link>
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Icon from "@/components/common/Icon.vue";

const route = useRoute();

console.log({ ...route });
</script>