<template>
    <div class="options__option" @click="onClick">
        <slot />
    </div>
</template>

<script lang="ts" setup>
import { inject, Ref } from "vue";
import { Primitive } from "@/model/utils";

const props = defineProps<{
    value: Primitive;
}>();

const value = inject("value") as Ref<Primitive | Primitive[]>;

const onClick = () => {
    value.value = props.value;
};
</script>