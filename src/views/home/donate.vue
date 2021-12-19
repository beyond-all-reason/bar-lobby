<route>{ "meta": { "title": "Donate", "order": 0 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- BAR is a free, open-source project supported by hardworking individuals blahblah
- How your donation gets used
- Donate button
- List of donators
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