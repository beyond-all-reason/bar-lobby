<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- A gridform row: the label cell, then the control cell. -->
<template>
    <div class="label-cell">
        <div class="label-row" :class="{ overridden }">
            <span>{{ show(descriptor.label) }}</span>
            <Icon
                v-if="descriptor.deviceOnly"
                v-tooltip.right="t('lobby.navbar.settings.engine.deviceOnly')"
                :icon="monitor"
                class="device-only"
            />
        </div>
        <small v-if="descriptor.description" class="description">{{ show(descriptor.description) }}</small>
    </div>
    <div class="flex-col gap-sm">
        <div class="control-row">
            <Range
                v-if="slider"
                :modelValue="draggedValue ?? shownNumber ?? slider.min"
                commitOnRelease
                :disabled="disabled"
                :min="slider.min"
                :max="slider.max"
                :step="slider.step"
                :class="{ overridden }"
                @preview="(preview: number | number[]) => (draggedValue = preview as number)"
                @update:modelValue="(committed: number | number[]) => commit(committed as number)"
            />
            <Number
                v-else-if="numberBox"
                :modelValue="shownNumber"
                :disabled="disabled"
                :min="numberBox.min"
                :max="numberBox.max"
                :maxFractionDigits="numberBox.integer ? 0 : 6"
                :useGrouping="false"
                :class="{ overridden }"
                @update:modelValue="(committed: number) => commit(committed)"
            />
            <Checkbox
                v-else-if="descriptor.control === 'checkbox'"
                :modelValue="shownValue === true"
                :disabled="disabled"
                :class="{ overridden }"
                @update:modelValue="(checked: boolean) => !disabled && commit(checked)"
            />
            <Select
                v-else-if="selectList"
                :modelValue="shownValue"
                :options="selectOptions"
                optionLabel="label"
                optionValue="value"
                :disabled="disabled"
                :class="{ overridden }"
                class="select"
                @update:modelValue="(chosen: string) => commit(chosen)"
            />
            <Textbox v-else v-model="textDraft" :disabled="disabled" :class="{ overridden }" class="text" @change="commit(textDraft)" />
            <Button
                v-tooltip.left="t('lobby.navbar.settings.engine.resetToDefault')"
                class="slim square"
                :disabled="!overridden || disabled"
                @click="engineSettingsLogic.reset(descriptor)"
            >
                <Icon :icon="restore" />
            </Button>
        </div>
        <small v-if="changeError" class="error">{{ t(engineSettingsLogic.failureKey(changeError)) }}</small>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import monitor from "@iconify-icons/mdi/monitor";
import restore from "@iconify-icons/mdi/restore";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Number from "@renderer/components/controls/Number.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { useTypedI18n } from "@renderer/i18n";
import { engineSettingsLogic } from "@renderer/logic/engine-settings";
import type { EngineSettingDescriptor, EngineSettingText, EngineSettingValue } from "@renderer/logic/engine-settings/descriptors";
import { engineSettingsStore } from "@renderer/store/engine-settings.store";

const { t } = useTypedI18n();

const props = defineProps<{ descriptor: EngineSettingDescriptor; disabled?: boolean }>();

const show = (text: EngineSettingText) => ("key" in text ? t(text.key) : text.text);

const slider = computed(() => (props.descriptor.control === "slider" ? props.descriptor : undefined));
const numberBox = computed(() => (props.descriptor.control === "number" ? props.descriptor : undefined));
const selectList = computed(() => (props.descriptor.control === "select" ? props.descriptor : undefined));
const selectOptions = computed(() => selectList.value?.options.map((option) => ({ value: option.value, label: show(option.label) })) ?? []);

type Value = EngineSettingValue<EngineSettingDescriptor>;

const value = computed(() => engineSettingsLogic.value(props.descriptor));
const overridden = computed(() => engineSettingsLogic.isOverridden(props.descriptor.key));
const changeError = computed(() => engineSettingsStore.changeErrors.get(props.descriptor.key));

const draggedValue = ref<number | null>(null);
// Shown until main answers, so the control doesn't jump back to the old value for the round trip.
const committingValue = ref<Value | null>(null);
const shownValue = computed(() => committingValue.value ?? value.value);
const shownNumber = computed(() => (typeof shownValue.value === "number" ? shownValue.value : undefined));

// Typed text is kept until it is committed, and follows the setting otherwise.
const textDraft = ref("");
watch(
    () => shownValue.value,
    (shown) => (textDraft.value = typeof shown === "string" ? shown : ""),
    { immediate: true }
);

async function commit(committed: Value) {
    draggedValue.value = null;
    // Already the value, or already on its way, such as a change event heard on both the text box and its input.
    if (committed === value.value || committed === committingValue.value) return;

    committingValue.value = committed;
    try {
        await engineSettingsLogic.set(props.descriptor, committed);
    } finally {
        // A later commit may have replaced it while this one was in flight.
        if (committingValue.value === committed) committingValue.value = null;
    }
}
</script>

<style lang="scss" scoped>
.label-cell {
    gap: 2px;
}

.label-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.device-only {
    opacity: 0.6;
}

.description {
    max-width: 320px;
    opacity: 0.6;
    font-size: 11px;
    white-space: pre-line;
}

.control-row {
    display: flex;
    align-items: center;
    gap: 6px;

    .text,
    .select {
        flex: 1;
    }
}

.overridden {
    color: #ffcc00;
    :deep(.p-slider-handle),
    :deep(.p-slider-range) {
        background-color: #ffcc00;
    }
}

.error {
    color: #ff6b6b;
    font-size: 11px;
}
</style>
