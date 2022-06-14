<template>
    <Modal :title="title" width="700px" height="400px" padding="0">
        <Panel scrollContent>
            <Tab v-for="section of sections.filter((section) => !section.hidden)" :key="section.key" :title="section.name" :tooltip="section.description">
                <div class="gap-md">
                    <div class="gridform">
                        <template v-for="option in section.options.filter((option) => !option.hidden)" :key="option.key">
                            <div>
                                <div>{{ option.name }}</div>
                                <div v-if="option.description" class="txt-sm flex-wrap">
                                    {{ option.description }}
                                </div>
                            </div>
                            <Range
                                v-if="option.type === 'number'"
                                :modelValue="optionsObj[option.key] ?? option.default"
                                :min="option.min"
                                :max="option.max"
                                :interval="option.step"
                                trimLabel
                                @update:model-value="(value) => setOptionValue(option, value)"
                            />
                            <Checkbox v-if="option.type === 'boolean'" :modelValue="optionsObj[option.key] ?? option.default" @update:model-value="(value) => setOptionValue(option, value)" />
                            <Textbox v-if="option.type === 'string'" :modelValue="optionsObj[option.key] ?? option.default" @update:model-value="(value) => setOptionValue(option, value)" />
                            <Select
                                v-if="option.type === 'list'"
                                :modelValue="optionsObj[option.key] ?? option.default"
                                :options="option.options"
                                :labelBy="(option: any) => option.name"
                                :valueBy="(option: any) => option.key"
                                @update:model-value="(value) => setOptionValue(option, value)"
                            />
                        </template>
                    </div>
                </div>
            </Tab>
        </Panel>
    </Modal>
</template>

<script lang="ts" setup>
import { toRef } from "vue";

import Modal from "@/components/common/Modal.vue";
import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import { LuaOptionBoolean, LuaOptionList, LuaOptionNumber, LuaOptionSection, LuaOptionString } from "@/model/lua-options";

const props = defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    luaOptions: Record<string, any>;
    id: string;
    title: string;
    sections: LuaOptionSection[];
}>();

const optionsObj = toRef(props, "luaOptions");

const emits = defineEmits<{
    (event: "setOption", optionKey: string, optionValue: unknown): void;
}>();

const setOptionValue = (option: LuaOptionNumber | LuaOptionBoolean | LuaOptionString | LuaOptionList, value: unknown) => {
    if (value === option.default) {
        emits("setOption", option.key, undefined);
    } else {
        emits("setOption", option.key, value);
    }
};
</script>

<style lang="scss" scoped></style>
