<template>
    <div class="control select">
        <label for="textbox" v-if="label">{{ label }}</label>
        <vue-select :hide-selected="true" v-bind="$attrs"> </vue-select>
    </div>
</template>

<script lang="ts">
import { defineComponent, toRef } from "vue";

export default defineComponent({
    props: {
        label: String,
    },
    setup(props) {
        const label = toRef(props, "label");
        return { label };
    }
});
</script>

<style scoped lang="scss">
</style>