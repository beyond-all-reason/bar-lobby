<route>{ "meta": { "title": "Changes", "order": 2 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Should manual updates (blog-like posts) be in news section or here?
- Balance changes
- Github changes from all BAR repos?
" />
    </div>
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