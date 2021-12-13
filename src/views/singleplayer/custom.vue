<route>{ "meta": { "title": "Custom", "order": 2, "offline": true } }</route>

<template>
    <Panel>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Uses same Battle component as multiplayer custom battles but hides chat and spectators
" />
        <Battle />
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