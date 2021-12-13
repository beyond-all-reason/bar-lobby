<route>{ "meta": { "title": "Battle" } }</route>

<template>
    <Panel>
        <h1>{{ route.meta.title }}</h1>
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