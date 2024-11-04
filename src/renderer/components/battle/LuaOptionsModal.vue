<template>
    <Modal ref="modal" :title="title" no-padding>
        <TabView class="lua-options-panel">
            <TabPanel v-for="section of sections.filter((section) => !section.hidden)" :key="section.key" :header="section.name">
                <div class="gridform">
                    <template v-for="option in section.options.filter((option) => !option.hidden)" :key="option.key">
                        <div>
                            <div
                                v-tooltip.bottom="{ value: option.description || '' }"
                                :class="{
                                    overriden: battleStore.battleOptions.gameMode.options[option.key] !== undefined,
                                }"
                            >
                                {{ option.name }}
                            </div>
                        </div>
                        <Range
                            v-if="option.type === 'number'"
                            :modelValue="battleStore.battleOptions.gameMode.options[option.key] ?? option.default"
                            :min="option.min"
                            :max="option.max"
                            :step="option.step"
                            @update:model-value="(value: any) => setOptionValue(option, value)"
                            v-tooltip.bottom="{ value: option.description || '' }"
                            :class="{
                                overriden: battleStore.battleOptions.gameMode.options[option.key] !== undefined,
                            }"
                        />
                        <Checkbox
                            v-if="option.type === 'boolean'"
                            :modelValue="battleStore.battleOptions.gameMode.options[option.key] ?? option.default"
                            @update:model-value="(value) => setOptionValue(option, value)"
                            v-tooltip.right="{ value: option.description || '' }"
                            :class="{
                                overriden: battleStore.battleOptions.gameMode.options[option.key] !== undefined,
                            }"
                        />
                        <Textarea
                            v-if="option.type === 'string'"
                            class="fullwidth"
                            :modelValue="battleStore.battleOptions.gameMode.options[option.key] ?? option.default"
                            @update:model-value="(value) => setOptionValue(option, value)"
                            v-tooltip.bottom="{ value: option.description || '' }"
                            :class="{
                                overriden: battleStore.battleOptions.gameMode.options[option.key] !== undefined,
                            }"
                        />
                        <Select
                            v-if="option.type === 'list'"
                            :modelValue="battleStore.battleOptions.gameMode.options[option.key] ?? option.default"
                            :options="option.options"
                            optionLabel="name"
                            optionValue="key"
                            @update:model-value="(value: any) => setOptionValue(option, value)"
                            v-tooltip.bottom="{ value: option.description || '' }"
                            :class="{
                                overriden: battleStore.battleOptions.gameMode.options[option.key] !== undefined,
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
import { battleStore } from "@renderer/store/battle.store";

defineProps<{
    id: string;
    title: string;
    sections: LuaOptionSection[];
}>();

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

function setOptionValue(option: LuaOptionNumber | LuaOptionBoolean | LuaOptionString | LuaOptionList, value: unknown) {
    if (value === option.default) {
        delete battleStore.battleOptions.gameMode.options[option.key];
    } else {
        battleStore.battleOptions.gameMode.options[option.key] = value;
    }
}

function close() {
    modal.value?.close();
}

function reset() {
    battleStore.battleOptions.gameMode.options = {};
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
