<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- A gridform row: the label cell, then the control cell. -->
<template>
    <div :class="{ overridden }">{{ "key" in descriptor.label ? t(descriptor.label.key) : descriptor.label.text }}</div>
    <div class="flex-col gap-sm">
        <div class="control-row">
            <Range
                :modelValue="shownValue"
                commitOnRelease
                :disabled="value === undefined || disabled"
                :min="descriptor.min"
                :max="descriptor.max"
                :step="descriptor.step"
                :class="{ overridden }"
                @preview="(preview: number | number[]) => (draggedValue = preview as number)"
                @update:modelValue="commit"
            />
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
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import restore from "@iconify-icons/mdi/restore";
import Button from "@renderer/components/controls/Button.vue";
import Range from "@renderer/components/controls/Range.vue";
import { useTypedI18n } from "@renderer/i18n";
import { engineSettingsLogic } from "@renderer/logic/engine-settings";
import type { SliderSettingDescriptor } from "@renderer/logic/engine-settings/descriptors";
import { engineSettingsStore } from "@renderer/store/engine-settings.store";

const { t } = useTypedI18n();

const props = defineProps<{ descriptor: SliderSettingDescriptor; disabled?: boolean }>();

const value = computed(() => engineSettingsLogic.value(props.descriptor));
const overridden = computed(() => engineSettingsLogic.isOverridden(props.descriptor.key));
const changeError = computed(() => engineSettingsStore.changeErrors.get(props.descriptor.key));

const draggedValue = ref<number | null>(null);
// Shown until main answers, so the slider doesn't jump back to the old value for the round trip.
const committingValue = ref<number | null>(null);
const shownValue = computed(() => draggedValue.value ?? committingValue.value ?? value.value ?? props.descriptor.min);

async function commit(committed: number | number[]) {
    draggedValue.value = null;
    if (committed === value.value) return;

    const target = committed as number;
    committingValue.value = target;
    try {
        await engineSettingsLogic.set(props.descriptor, target);
    } finally {
        // A later release may have replaced it while this one was in flight.
        if (committingValue.value === target) committingValue.value = null;
    }
}
</script>

<style lang="scss" scoped>
.control-row {
    display: flex;
    align-items: center;
    gap: 6px;
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
