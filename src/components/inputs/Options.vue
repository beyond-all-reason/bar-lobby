<template>
    <div class="options">
        <slot />
        Value: {{ value }}
    </div>
</template>

<script lang="ts" setup>
import { Primitive } from "@/model/utils";
import { provide, ref } from "vue";

const props = withDefaults(defineProps<{
    modelValue: Primitive | Primitive[];
    required: boolean;
}>(), {
    required: false
});

const value = ref(props.modelValue);

provide("value", value);
</script>