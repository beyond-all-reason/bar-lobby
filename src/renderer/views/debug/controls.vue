<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Controls", order: 0 } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="controls flex-col gap-md">
                <div class="flex-row gap-md flex-center-items">
                    <Button> Button </Button>
                    <Button :disabled="true"> Disabled Button </Button>
                    <Button v-tooltip="'Green button'" class="green"> Green Button </Button>
                    <Button v-tooltip="'Red button'" class="red"> Red Button </Button>
                    <Button v-tooltip.bottom="'Blue button'" class="blue"> Blue Button </Button>
                    <Button v-tooltip="'Black button'" class="black"> Black Button </Button>
                    <Button v-tooltip="'Grey button'" class="grey"> Grey Button </Button>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Textbox :modelValue="text" @update:model-value="onUpdateText" />
                    <Textbox v-model="text" label="Label" />
                    <Textbox v-model="text" :disabled="true" />
                    <div class="value">{{ text }}</div>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <SearchBox v-model="text" />
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Number :modelValue="num" showButtons @update:model-value="onUpdateNum" />
                    <Number v-model="num" label="Label" showButtons />
                    <Number v-model="num" :disabled="true" />
                    <div class="value">{{ num }}</div>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Select
                        :modelValue="selection"
                        :options="selections"
                        optionLabel="name"
                        optionValue="value"
                        :placeholder="selection"
                        @update:model-value="onUpdateSelection"
                    />
                    <Select
                        v-model="selection"
                        :options="selections"
                        label="Label"
                        optionLabel="name"
                        optionValue="value"
                        :placeholder="selection"
                        :filter="true"
                    />
                    <Select
                        v-model="selection"
                        :options="selections"
                        optionLabel="name"
                        optionValue="value"
                        :placeholder="selection"
                        :disabled="true"
                    />
                    <div class="value">{{ selection }}</div>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Range :modelValue="range" @update:model-value="onUpdateRange" />
                    <Range v-model="range" label="Label" />
                    <Range v-model="range" :disabled="true" />
                    <div class="value">{{ range }}</div>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Range :modelValue="rangeLowHigh" @update:model-value="onUpdateRangeLowHigh" :min="2" :max="40" range />
                    <Range v-model="rangeLowHigh" label="Label" :min="2" :max="40" range />
                    <Range v-model="rangeLowHigh" :disabled="true" :min="2" :max="40" range />
                    <div class="value">{{ rangeLowHigh }}</div>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Checkbox :modelValue="checked" @update:model-value="onUpdateChecked" />
                    <Checkbox v-model="checked" label="Label" />
                    <Checkbox v-model="checked" :disabled="true" />
                    <div class="value">{{ checked }}</div>
                </div>
                <div class="flex-row gap-md flex-center-items">
                    <Options :modelValue="option" :options="options" @update:model-value="onUpdateOption" />
                    <Options v-model="option" :options="options" label="Label" />
                    <Options v-model="option" :options="options" :unselectable="false" />
                    <Options v-model="option" :options="options" :disabled="true" />
                </div>
                <div class="flex-row">
                    <Textbox v-model="text" />
                    <Select
                        v-model="selection"
                        :options="selections"
                        optionLabel="name"
                        optionValue="value"
                        :placeholder="selection"
                        :filter="true"
                    />
                    <Range v-model="range" />
                    <Checkbox v-model="checked" />
                    <Options v-model="option" :options="options" />
                </div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Number from "@renderer/components/controls/Number.vue";
import Options from "@renderer/components/controls/Options.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import Panel from "@renderer/components/common/Panel.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";

const text = ref("textbox");
function onUpdateText(newText: string) {
    text.value = newText;
}

const num = ref(5);
function onUpdateNum(newNum: number) {
    num.value = newNum;
}

const selection = ref("blue");
const selections = ref([
    { name: "Red", value: "red" },
    { name: "Blue", value: "blue" },
    { name: "Green", value: "green" },
]);
function onUpdateSelection(newSelection: string) {
    selection.value = newSelection;
}

const range: Ref<number | number[]> = ref(0);
function onUpdateRange(newRange: number | number[]) {
    range.value = newRange;
}

const rangeLowHigh: Ref<number | number[]> = ref([2, 32]);
function onUpdateRangeLowHigh(newRange: number | number[]) {
    rangeLowHigh.value = newRange;
}

const checked = ref(false);
function onUpdateChecked() {
    checked.value = !checked.value;
}

const option: Ref<string | null> = ref(null);
const options = ref(["Purple", "Orange", "Black"]);
function onUpdateOption(newValue: string | null) {
    option.value = newValue;
}
</script>

<style lang="scss" scoped>
.controls {
    max-width: 100%;
}
.value {
    min-width: 150px;
}
</style>
