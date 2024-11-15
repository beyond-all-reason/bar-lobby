<template>
    <Modal ref="modal" :title="title" no-padding>
        <TabView class="lua-options-panel">
            <TabPanel v-for="section of sections.filter((section) => !section.hidden)" :key="section.key" :header="section.name">
                <div class="gridform">
                    <template v-for="o in section.options.filter((option) => !option.hidden)" :key="o.key">
                        <div>
                            <div
                                v-tooltip.bottom="{ value: o.description || '' }"
                                :class="{
                                    overriden: options[o.key] !== undefined,
                                }"
                            >
                                {{ o.name }}
                            </div>
                        </div>
                        <Range
                            v-if="o.type === 'number'"
                            :modelValue="options[o.key] ?? o.default"
                            :min="o.min"
                            :max="o.max"
                            :step="o.step"
                            @update:model-value="(value: any) => setOptionValue(o, value)"
                            v-tooltip.bottom="{ value: o.description || '' }"
                            :class="{
                                overriden: options[o.key] !== undefined,
                            }"
                        />
                        <Checkbox
                            v-if="o.type === 'boolean'"
                            :modelValue="options[o.key] ?? o.default"
                            @update:model-value="(value) => setOptionValue(o, value)"
                            v-tooltip.right="{ value: o.description || '' }"
                            :class="{
                                overriden: options[o.key] !== undefined,
                            }"
                        />
                        <Textarea
                            v-if="o.type === 'string'"
                            class="fullwidth"
                            :modelValue="options[o.key] ?? o.default"
                            @update:model-value="(value) => setOptionValue(o, value)"
                            v-tooltip.bottom="{ value: o.description || '' }"
                            :class="{
                                overriden: options[o.key] !== undefined,
                            }"
                        />
                        <Select
                            v-if="o.type === 'list'"
                            :modelValue="options[o.key] ?? o.default"
                            :options="o.options"
                            optionLabel="name"
                            optionValue="key"
                            @update:model-value="(value: any) => setOptionValue(o, value)"
                            v-tooltip.bottom="{ value: o.description || '' }"
                            :class="{
                                overriden: options[o.key] !== undefined,
                            }"
                        />
                    </template>
                </div>
            </TabPanel>
        </TabView>
        <template #footer>
            <div class="actions">
                <Button class="fullwidth" @click="reset">Reset all to default</Button>
                <Button class="green fullwidth" @click="close">Close</Button>
            </div>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import TabPanel from "primevue/tabpanel";
import { Ref, ref } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import TabView from "@renderer/components/common/TabView.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import { LuaOptionSection, LuaOptionNumber, LuaOptionBoolean, LuaOptionString, LuaOptionList } from "@main/content/game/lua-options";
import Textarea from "@renderer/components/controls/Textarea.vue";

const props = defineProps<{
    id: string;
    title: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any>;
    sections: LuaOptionSection[];
}>();

const options = ref(props.options);

const emit = defineEmits<{
    (event: "set-options", options: Record<string, boolean | string | number>): void;
}>();

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

function setOptionValue(option: LuaOptionNumber | LuaOptionBoolean | LuaOptionString | LuaOptionList, value: unknown) {
    if (value === option.default) {
        delete options.value[option.key];
    } else {
        options.value[option.key] = value;
    }
    emit("set-options", options.value);
}

function close() {
    modal.value?.close();
}

function reset() {
    options.value = {};
    emit("set-options", options.value);
}
</script>

<style lang="scss" scoped>
.lua-options-panel {
    display: flex;
    flex-direction: column;
    width: 1000px;
    height: 80vh;
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

.gridform {
    padding-bottom: 25px;
}

.overriden {
    color: #ffcc00;
    ::v-deep .p-slider-handle {
        background-color: #ffcc00;
    }
    ::v-deep .p-slider-range {
        background-color: #ffcc00;
    }
}
</style>
