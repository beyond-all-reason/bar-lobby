<template>
    <Modal ref="modal" :title="title" class="lua-options-modal" @open="open">
        <TabView class="lua-options-panel">
            <TabPanel v-for="section of sections.filter((section) => !section.hidden)" :key="section.key" :header="section.name">
                <div class="flex-col gap-md">
                    <h4>{{ section.description }}</h4>

                    <div class="gridform">
                        <template v-for="option in section.options.filter((option) => !option.hidden)" :key="option.key">
                            <div>
                                <div>{{ option.name }}</div>
                                <div v-if="option.description" class="description txt-sm flex-wrap">
                                    {{ option.description }}
                                </div>
                            </div>
                            <Range
                                v-if="option.type === 'number'"
                                :modelValue="options[option.key] ?? option.default"
                                :min="option.min"
                                :max="option.max"
                                :step="option.step"
                                @update:model-value="(value: any) => setOptionValue(option, value)"
                            />
                            <Checkbox
                                v-if="option.type === 'boolean'"
                                :modelValue="options[option.key] ?? option.default"
                                @update:model-value="(value) => setOptionValue(option, value)"
                            />
                            <Textbox
                                v-if="option.type === 'string'"
                                :modelValue="options[option.key] ?? option.default"
                                @update:model-value="(value) => setOptionValue(option, value)"
                            />
                            <Select
                                v-if="option.type === 'list'"
                                :modelValue="options[option.key] ?? option.default"
                                :options="option.options"
                                optionLabel="name"
                                optionValue="key"
                                @update:model-value="(value: any) => setOptionValue(option, value)"
                            />
                        </template>
                    </div>
                </div>
            </TabPanel>
        </TabView>
        <template #footer>
            <div class="actions">
                <Button class="red fullwidth" @click="close"> Cancel </Button>
                <Button class="yellow fullwidth" @click="reset"> Reset all to default </Button>
                <Button class="green fullwidth" @click="save"> Save </Button>
            </div>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-explicit-any */

import { clone } from "jaz-ts-utils";
import TabPanel from "primevue/tabpanel";
import { reactive, Ref, ref, toRaw } from "vue";

import Modal from "@/components/common/Modal.vue";
import TabView from "@/components/common/TabView.vue";
import Button from "@/components/controls/Button.vue";
import Checkbox from "@/components/controls/Checkbox.vue";
import Range from "@/components/controls/Range.vue";
import Select from "@/components/controls/Select.vue";
import Textbox from "@/components/controls/Textbox.vue";
import { LuaOptionBoolean, LuaOptionList, LuaOptionNumber, LuaOptionSection, LuaOptionString } from "@/model/lua-options";
import { setObject } from "@/utils/temp";

const props = defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    luaOptions: Record<string, any>;
    id: string;
    title: string;
    sections: LuaOptionSection[];
}>();

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const options: Record<string, any> = reactive({});

const emits = defineEmits<{
    (event: "setOptions", options: Record<string, any>): void;
}>();

function setOptionValue(option: LuaOptionNumber | LuaOptionBoolean | LuaOptionString | LuaOptionList, value: unknown) {
    if (value === option.default) {
        delete options[option.key];
    } else {
        options[option.key] = value;
    }
}

function open() {
    setObject(options, toRaw(props.luaOptions));
}

function close() {
    modal.value?.close();
}

function reset() {
    setObject(options, {});
}

function save() {
    emits("setOptions", clone(toRaw(options)));
    modal.value?.close();
}
</script>

<style lang="scss" scoped>
:global(.lua-options-modal > .content) {
    padding: 0 !important;
}
.lua-options-panel {
    display: flex;
    flex-direction: column;
    width: 700px;
    height: 600px;
}
.description {
    white-space: pre;
}
.actions {
    display: flex;
    flex-direction: row;
    padding: 10px;
    gap: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
