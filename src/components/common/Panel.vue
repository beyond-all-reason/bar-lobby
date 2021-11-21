<template>
    <div class="panel">
        <div class="content" :style="`--gap: ${gap}`">
            <slot />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        gap: {
            type: String,
            default: "10px"
        }
    },
    setup() {
        return { };
    }
});
</script>

<style scoped lang="scss">
.panel {
    position: relative;
    max-height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
.content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    flex-grow: 1;
}
</style>