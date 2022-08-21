<template>
    <div class="controls flex-col gap-md">
        <div class="flex-row gap-md flex-center-items">
            <Textbox2 :modelValue="text" @update:model-value="onUpdateText" />
            <Textbox2 v-model="text" />
            <Textbox2 :value="text" :disabled="true" @update:model-value="onUpdateText" />
            <div class="value">{{ text }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Select :modelValue="selection" :options="selections" :placeholder="selection" @update:model-value="onUpdateSelection" />
            <Select v-model="selection" :options="selections" :placeholder="selection" />
            <Select :modelValue="selection" :options="selections" :placeholder="selection" :disabled="true" @update:model-value="onUpdateSelection" />
            <div class="value">{{ selection }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Range :modelValue="range" @update:model-value="onUpdateRange" />
            <Range v-model="range" />
            <Range :modelValue="range" :disabled="true" @update:model-value="onUpdateRange" />
            <div class="value">{{ range }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Checkbox2 :modelValue="checked" @update:model-value="onUpdateChecked" />
            <Checkbox2 v-model="checked" />
            <Checkbox2 :modelValue="checked" :disabled="true" @update:model-value="onUpdateChecked" />
            <div class="value">{{ checked }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Options2 />
        </div>
        <div class="flex-row">
            <Textbox2 :modelValue="text" @update:model-value="onUpdateText" />
            <Select :modelValue="selection" :options="selections" :placeholder="selection" @update:model-value="onUpdateSelection" />
            <Range :modelValue="range" @update:model-value="onUpdateRange" />
            <Checkbox2 :modelValue="checked" @update:model-value="onUpdateChecked" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import Checkbox2 from "@/components/inputs/Checkbox2.vue";
import Options2 from "@/components/inputs/Options2.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";
import Textbox2 from "@/components/inputs/Textbox2.vue";

const text = ref("hello");
const onUpdateText = (newText: string) => {
    text.value = newText;
};

const selection = ref("red");
const selections = ref(["red", "green", "blue"]);
const onUpdateSelection = (newSelection: string) => {
    selection.value = newSelection;
};

const range: Ref<number | number[]> = ref(0);
const onUpdateRange = (newRange: number | number[]) => {
    range.value = newRange;
};

const checked = ref(false);
const onUpdateChecked = () => {
    checked.value = !checked.value;
};
</script>

<style lang="scss" scoped>
.controls {
    max-width: 900px;
}
.value {
    min-width: 150px;
}
</style>
