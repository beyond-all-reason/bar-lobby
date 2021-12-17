<template>
    <div ref="progressEl" class="progress fullsize flex-center">
        <div class="bar">
            <div class="current">
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useCssVar } from "@vueuse/core";

export default defineComponent({
    props: {
        percent: {
            type: Number,
            default: 0
        }
    },
    setup(props) {
        const progressEl = ref(null);
        const percent = useCssVar("--progress", progressEl);

        watch(props, () => {
            percent.value = `${props.percent * 100}%`;
        });

        return { progressEl };
    }
});
</script>