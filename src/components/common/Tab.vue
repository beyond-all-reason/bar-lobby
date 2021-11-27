<template>
    <div class="tab">
        <slot/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "Tab",
    props: {
        title: {
            type: String,
            required: true
        }
    },
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
</style>