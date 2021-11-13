<template>
    <div class="control">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <input :id="uuid" :type="type" v-bind="$attrs" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)">
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs } from "vue";
import { v4 as uuidv4 } from "uuid";

export default defineComponent({
    props: {
        type: {
            type: String,
            default: "text"
        },
        label: String,
        modelValue: String,
    },
    setup(props) {
        const uuid = ref(uuidv4());
        const label = ref(props.label);
        const { type } = toRefs(props);

        return { uuid, type, label };
    }
});
</script>

<style scoped lang="scss">
</style>