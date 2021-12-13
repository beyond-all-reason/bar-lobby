<route>{ "meta": { "title": "Campaign", "order": 0, "offline": true } }</route>

<template>
    <Panel>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- New campaign
- Continue campaign
- Load save
- Mission select
" />
    </Panel>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    setup() {
        const route = useRoute();

        return { route };
    }
});
</script>