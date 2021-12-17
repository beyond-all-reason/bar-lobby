<route>{ "meta": { "title": "Tournaments", "order": 3 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Automated tournaments list (like in rocket league)
- Official tournaments list
- Unofficial tournaments list
- Host unofficial tournament button + modal (ability to even automate prize pools would be awesome)
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