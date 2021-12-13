<route>{ "meta": { "title": "Matches", "order": 3 } }</route>

<template>
    <Panel>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Full match history view
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