<template>
    <div ref="test" class="p-inputgroup" @mouseenter="onMouseEnter">
        <div v-if="label" class="label" @click="focus">{{ label }}</div>
        <slot />
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

const props = defineProps<{
    label?: string;
    disabled?: boolean;
}>();

const test: Ref<HTMLElement | null> = ref(null);

const focus = () => {
    if (test.value) {
        const slotEl = test.value.querySelector(".label + *") as HTMLElement;
        slotEl.click();
    }
};

const onMouseEnter = () => {
    api.audio.getSound("button-hover").play();
};
</script>

<style lang="scss" scoped>
.p-inputgroup {
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .label {
        padding: 5px 10px;
        border-radius: 0px;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
}
</style>
