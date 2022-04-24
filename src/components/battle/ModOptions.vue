<template>
    <Panel :paginated-tabs="true" padding="10px" light scroll-content>
        <Tab v-for="section in modOptionsSchema.filter(section => !section.hidden)" :key="section.key" :title="section.name" class="flex-col gap-md">
            <Tooltip v-for="option in section.options.filter(option => !option.hidden)" :key="option.key" :content="option.description">
                <Range v-if="isNumberOption(option)" :label="option.name" :model-value="option.default" :min="option.min" :max="option.max" :interval="option.step" trim-label @change="value => setModOption(value, option)" />
                <Checkbox v-if="isBooleanOption(option)" :label="option.name" :model-value="option.default" small-label @change="value => setModOption(value, option)" />
                <Select v-if="isListOption(option)" :label="option.name" :model-value="option.default" :options="option.options" :label-by="(option: any) => option.name" :value-by="(option: any) => option.key" small-label @change="value => setModOption(value, option)" />
            </Tooltip>
        </Tab>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";
import { GameVersionFormat } from "@/model/formats";
import { onMounted, reactive } from "vue";
import Range from "@/components/inputs/Range.vue";
import { isNumberOption, isBooleanOption, isListOption, ModOptionNumber, ModOptionBoolean, ModOptionList, ModOptionSection } from "@/model/mod-options";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Select from "@/components/inputs/Select.vue";
import Tooltip from "@/components/common/Tooltip.vue";

const props = defineProps<{
    gameVersion: GameVersionFormat
}>();

const modOptions: Record<string, string> = reactive({});
const modOptionsSchema: ModOptionSection[] = reactive([]);

onMounted(async () => {
    const modOptionSections = await api.content.game.getModOptions(props.gameVersion);
    modOptionsSchema.push(...modOptionSections);
});

const setModOption = (value: string | number | boolean, option: ModOptionNumber | ModOptionBoolean | ModOptionList) => {
    if (value === option.default) {
        delete modOptions[option.key];
    } else {
        modOptions[option.key] = value.toString();
    }
    console.log(modOptions);
};
</script>