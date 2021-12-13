<route>{ "meta": { "title": "Contribute", "order": 2 } }</route>

<template>
    <Panel>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- List of contributors
- Details on contributing
- Donate section
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