<template>
    <div class="control">
        <label for="textbox" v-if="label">{{ label }}</label>
        <select v-bind="$attrs" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)">
            <option value="none">None</option>
            <option value="carbon">carbon</option>
        </select>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    props: {
        label: String,
        modelValue: String,
    },
    setup(props) {
        const label = ref(props.label);
        
        return { label };
    }
});
</script>

<style scoped lang="scss">
</style>