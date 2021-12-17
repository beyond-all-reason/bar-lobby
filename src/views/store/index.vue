<route>{ "meta": { "title": "Store", "order": 4 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Unit skins
- HUD themes
- Custom Emojis 🙃
- Particle/projectile effects?
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