<template>
    <div class="control">
        <input :id="uuid" type="checkbox" v-model="checked" @change="$emit('update:modelValue', checked)">
        <label :for="uuid" :class="{ checked }">
            <div class="icon">
                <Icon class="check" icon="check-bold" />
            </div>
            <div class="label">{{ label }}</div>
        </label>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { v4 as uuidv4 } from "uuid";

export default defineComponent({
    props: {
        type: {
            type: String,
            default: "text"
        },
        label: {
            type: String,
            default: "Label"
        },
        modelValue: Boolean,
    },
    setup(props, context) {
        const uuid = ref(uuidv4());
        const label = ref(props.label);
        const checked = ref(props.modelValue);

        return { uuid, label, checked };
    }
});
</script>

<style scoped lang="scss">
.checkmark {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 0;
}

input[type=checkbox] {
    display: none;
}
label {
    display: flex;
    position: relative;
    gap: 15px;
    padding-left: 5px !important;
}
.icon {
    &:after {
        position: absolute;
        content: "";
        top: 0;
        margin-left: 4px;
        width: 1px;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
    }
}
.check {
    visibility: hidden;
}
.checked .check {
    visibility: visible;
}
</style>