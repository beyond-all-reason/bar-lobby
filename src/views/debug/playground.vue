<template>
    <Panel>
        <Range label="cool" :min="5" v-model="thing" />
    </Panel>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const thing = ref(5);

        return { thing };
    }
});
</script>

<style scoped lang="scss">
</style>