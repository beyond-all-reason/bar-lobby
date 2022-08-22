<route lang="json">
{ "meta": { "title": "Controls", "order": 1 } }
</route>

<template>
    <div class="controls flex-col gap-md">
        <div class="flex-row gap-md flex-center-items">
            <Button> Button </Button>
            <Button :disabled="true"> Disabled Button </Button>
            <Button color="red"> Red Button </Button>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Textbox2 :modelValue="text" @update:model-value="onUpdateText" />
            <Textbox2 v-model="text" />
            <Textbox2 v-model="text" :disabled="true" />
            <div class="value">{{ text }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Select :modelValue="selection" :options="selections" :placeholder="selection" @update:model-value="onUpdateSelection" />
            <Select v-model="selection" :options="selections" :placeholder="selection" :filter="true" />
            <Select v-model="selection" :options="selections" :placeholder="selection" :disabled="true" />
            <div class="value">{{ selection }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Range :modelValue="range" @update:model-value="onUpdateRange" />
            <Range v-model="range" />
            <Range v-model="range" :disabled="true" />
            <div class="value">{{ range }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Checkbox2 :modelValue="checked" @update:model-value="onUpdateChecked" />
            <Checkbox2 v-model="checked" />
            <Checkbox2 v-model="checked" :disabled="true" />
            <div class="value">{{ checked }}</div>
        </div>
        <div class="flex-row gap-md flex-center-items">
            <Options2 :modelValue="selection" :options="selections" @update:model-value="onUpdateSelection" />
            <Options2 v-model="selection" :options="selections" />
            <Options2 v-model="selection" :options="selections" :disabled="true" />
        </div>
        <div class="flex-row">
            <Textbox2 v-model="text" />
            <Select v-model="selection" :options="selections" :placeholder="selection" :filter="true" />
            <Range v-model="range" />
            <Checkbox2 v-model="checked" />
            <Options2 v-model="selection" :options="selections" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import Button from "@/components/inputs/Button.vue";
import Checkbox2 from "@/components/inputs/Checkbox2.vue";
import Options2 from "@/components/inputs/Options2.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";
import Textbox2 from "@/components/inputs/Textbox2.vue";

const text = ref("textbox");
const onUpdateText = (newText: string) => {
    text.value = newText;
};

const selection = ref("select");
const selections = ref(["select", "green", "blue"]);
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
    max-width: 100%;
}
.value {
    min-width: 150px;
}
</style>
