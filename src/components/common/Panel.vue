<template>
    <component class="panel" :is="is">
        <div class="content" :style="`--gap: ${gap}`">
            <slot />
        </div>
    </component>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        is: {
            type: String,
            default: "div"
        },
        gap: {
            type: String,
            default: "10px"
        }
    },
    setup(props) {
        return { is: props.is };
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