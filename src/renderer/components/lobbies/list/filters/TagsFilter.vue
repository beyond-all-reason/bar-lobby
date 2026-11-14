<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-sm">
        <div class="flex-row gap-sm">
            <Textbox v-model="entry" class="flex-grow" :placeholder="t('lobby.multiplayer.custom.filters.tags.placeholder')" />
            <Button class="slim" :disabled="!entry.trim()" @click="add(entry)">+</Button>
        </div>
        <div v-if="selected.length" class="flex-row flex-wrap gap-sm">
            <Chip
                v-for="tag in selected"
                :key="tag"
                :label="tag"
                removable
                :class="{ unknown: !availableTags.includes(tag) }"
                v-tooltip.bottom="{ value: t('lobby.multiplayer.custom.filters.tags.unknown'), disabled: availableTags.includes(tag) }"
                @remove="remove(tag)"
            />
        </div>
        <div v-if="suggestions.length" class="flex-row flex-wrap gap-sm">
            <div v-for="tag in suggestions" :key="tag" class="suggestion" @click="add(tag)">{{ tag }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import Chip from "primevue/chip";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const props = defineProps<{
    modelValue?: string[];
    availableTags: string[];
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string[] | undefined): void;
}>();

const entry = ref("");

const selected = computed(() => props.modelValue ?? []);

const suggestions = computed(() => {
    const typed = entry.value.trim().toLocaleLowerCase();
    return props.availableTags.filter((tag) => !selected.value.includes(tag) && tag.toLocaleLowerCase().includes(typed));
});

function add(tag: string) {
    const trimmed = tag.trim();
    entry.value = "";
    if (!trimmed || selected.value.includes(trimmed)) return;
    emit("update:modelValue", [...selected.value, trimmed]);
}

function remove(tag: string) {
    const remaining = selected.value.filter((other) => other !== tag);
    emit("update:modelValue", remaining.length ? remaining : undefined);
}
</script>

<style lang="scss" scoped>
.suggestion {
    padding: 2px 8px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
}
.unknown {
    opacity: 0.6;
    font-style: italic;
}
</style>
