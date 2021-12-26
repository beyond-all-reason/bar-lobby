<route>{ "meta": { "title": "Campaign", "order": 0, "offline": true } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- New campaign
- Continue campaign
- Load save
- Mission select
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>