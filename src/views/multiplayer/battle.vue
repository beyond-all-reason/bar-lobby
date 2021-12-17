<route>{ "meta": { "title": "Battle" } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Battle />
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