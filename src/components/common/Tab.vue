<template>
    <div class="tab-content">
        <slot/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "Tab"
});
</script>

<script lang="ts" setup>
import { defineProps } from "vue";

const props = defineProps({
    title: {
        type: String,
        required: true
    }
});
</script>

