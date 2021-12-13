<route>{ "meta": { "title": "Custom", "order": 2 } }</route>

<template>
    <Panel>
        <h1>{{ route.meta.title }}</h1>
        <p>This is a description</p>
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