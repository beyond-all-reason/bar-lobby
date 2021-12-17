<route>{ "meta": { "title": "Tutorials", "order": 3, "offline": true } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Custom type scenarios that slowly introduce the game in segmented chunks

Tutorials might include:

- Camera controls (Only show minimap)
- Commander + Commands (Now show build menu)
- Basic economy + Basic defense (Now show resource bars)
- Constructors + Factories + Buildpower
- Win condition
- Advanced economy
- Advanced units
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