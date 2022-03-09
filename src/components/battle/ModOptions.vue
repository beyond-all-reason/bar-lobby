<template>
    <Panel :paginated-tabs="true" padding="10px" light scroll-content>
        <Tab v-for="section in modOptionsSchema.filter(section => !section.hidden)" :key="section.key" :title="section.name" class="flex-col gap-sm">
            <template v-for="option in section.options.filter(option => !option.hidden)" :key="option.key">
                <Range v-if="isNumberOption(option) && option.min !== undefined" :label="option.name" :model-value="option.default" :min="option.min" :max="option.max" :interval="option.step" @change="value => setModOption(value, option)" />
            </template>
        </Tab>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";
import { GameVersionFormat } from "@/model/formats";
import { reactive } from "vue";
import Range from "@/components/inputs/Range.vue";
import { isNumberOption, ModOptionNumber, ModOptionBoolean, ModOptionList } from "@/model/mod-options";

const props = defineProps<{
    gameVersion: GameVersionFormat
}>();

const modOptionsSchema = await window.api.content.game.getModOptions(props.gameVersion);
const modOptions: Record<string, string> = reactive({});

const setModOption = (value: string | number | boolean, option: ModOptionNumber | ModOptionBoolean | ModOptionList) => {
    if (value === option.default) {
        delete modOptions[option.key];
    } else {
        modOptions[option.key] = value.toString();
    }
};
</script>