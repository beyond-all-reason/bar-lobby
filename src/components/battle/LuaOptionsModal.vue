<template>
    <Modal :name="id" :title="title" width="700px" height="400px" padding="0">
        <Panel scroll-content>
            <Tab v-for="section of sections.filter(section => !section.hidden)" :key="section.key" :title="section.name" :tooltip="section.description">
                <div class="gap-md">
                    <div class="gridform">
                        <template v-for="option in section.options.filter(option => !option.hidden)" :key="option.key">
                            <div>
                                <div>{{ option.name }}</div>
                                <div v-if="option.description" class="txt-sm flex-wrap">
                                    {{ option.description }}
                                </div>
                            </div>
                            <Range v-if="option.type === 'number'" :model-value="optionsObj[option.key] ?? option.default" :min="option.min" :max="option.max" :interval="option.step" trim-label @update:model-value="value => setOptionValue(option, value)" />
                            <Checkbox v-if="option.type === 'boolean'" :model-value="optionsObj[option.key] ?? option.default" @update:model-value="value => setOptionValue(option, value)" />
                            <Textbox v-if="option.type === 'string'" :model-value="optionsObj[option.key] ?? option.default" @update:model-value="value => setOptionValue(option, value)" />
                            <Select v-if="option.type === 'list'" :model-value="optionsObj[option.key] ?? option.default" :options="option.options" :label-by="(option: any) => option.name" :value-by="(option: any) => option.key" @update:model-value="value => setOptionValue(option, value)" />
                        </template>
                    </div>
                </div>
            </Tab>
        </Panel>
    </Modal>
</template>

<script lang="ts" setup>
import { LuaOptionBoolean, LuaOptionList, LuaOptionNumber, LuaOptionSection, LuaOptionString } from "@/model/lua-options";
import Modal from "@/components/common/Modal.vue";
import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";
import Range from "@/components/inputs/Range.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Select from "@/components/inputs/Select.vue";
import { toRef } from "vue";
import Textbox from "@/components/inputs/Textbox.vue";

const props = defineProps<{
    modelValue: Record<string, any>;
    id: string;
    title: string;
    sections: LuaOptionSection[]
}>();

const optionsObj = toRef(props, "modelValue");

const emits = defineEmits<{
    (event: "update:modelValue", config: Record<string, unknown>): void
}>();

const setOptionValue = (option: LuaOptionNumber | LuaOptionBoolean | LuaOptionString | LuaOptionList, value: unknown) => {
    if (value === option.default) {
        delete optionsObj.value[option.key];
    } else {
        optionsObj.value[option.key] = value;
    }
    emits("update:modelValue", optionsObj.value);
};
</script>