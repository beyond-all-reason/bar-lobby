<route>{ "meta": { "title": "Maps", "order": 1 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- How maps work
- Common workflow
- What makes a map good
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