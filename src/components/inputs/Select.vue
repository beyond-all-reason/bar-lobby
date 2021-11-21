<template>
    <div class="control">
        <label for="textbox" v-if="label">{{ label }}</label>
        <vue-select v-bind="$attrs"> </vue-select>
        <!-- <select v-bind="$attrs" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)">
            <option v-for="option in options" :key="option.key" :value="option.value">{{ option.key }}</option>
        </select> -->
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    props: {
        label: String,
        //modelValue: [String, Number, Boolean],
        //...VueNextSelect.props
        //options: [Array, Object],
        // keyTextModifier: Function
    },
    setup(props) {
        const label = ref(props.label);
        // let options = reactive([] as Array<{ key: unknown, value: unknown}>);
        // if (Array.isArray(props.options)) {
        //     if (isKeyValueArray(props.options)) {
        //         options = reactive(props.options);
        //     } else if (typeof props.options === "object"){
        //         options = reactive(props.options.map(value => {
        //             const key = props.keyTextModifier ? props.keyTextModifier(value) : value;
        //             return { key, value };
        //         }));
        //     }
        // } else if (typeof props.options === "object") {
        //     options = [];
        //     for (const [key, value] of Object.entries(props.options)) {
        //         options.push({ key, value });
        //     }
        // }
        
        //return { label, options };
        return { label };
    }
});

function isKeyValueArray(arr: any[]) : arr is Array<{ key: string, value: string}> {
    return arr.every(item => typeof item === "object" && typeof item.key === "string" && typeof item.value === "string");
}
</script>

<style scoped lang="scss">
</style>