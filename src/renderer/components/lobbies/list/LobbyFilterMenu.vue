<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Transition name="fade">
        <Panel v-if="open" class="filter-menu" :no-padding="true">
            <div class="body">
                <div class="flex-col gap-lg margin-md">
                    <section class="flex-col gap-sm">
                        <h6>{{ t("lobby.multiplayer.custom.menu.sortBy") }}</h6>
                        <div class="flex-row gap-sm">
                            <Select v-model="draft.sort.key" :options="sortOptions" optionLabel="label" optionValue="value" />
                            <Options
                                v-model="draft.sort.order"
                                :options="orderOptions"
                                optionLabel="label"
                                optionValue="value"
                                :unselectable="false"
                            />
                        </div>
                    </section>
                    <section class="flex-col gap-md">
                        <h6>{{ t("lobby.multiplayer.custom.menu.filters") }}</h6>
                        <div v-for="item in editors" :key="item.key" class="flex-col gap-xs" :class="{ inline: item.editor.inlineLabel }">
                            <label v-if="!item.editor.inlineLabel" class="txt-sm">{{ t(item.editor.labelKey) }}</label>
                            <component
                                :is="item.editor.component"
                                v-bind="item.editor.props?.(editorContext) ?? {}"
                                :modelValue="draft.filters[item.key]"
                                @update:modelValue="(value: unknown) => setFilter(item.key, value)"
                            />
                        </div>
                    </section>
                </div>
            </div>
            <template #footer>
                <div class="flex-row gap-md fullwidth padding-md">
                    <Button @click="reset">{{ t("lobby.multiplayer.custom.menu.reset") }}</Button>
                    <Button class="blue flex-right" @click="apply">{{ t("lobby.multiplayer.custom.menu.apply") }}</Button>
                </div>
            </template>
        </Panel>
    </Transition>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import Options from "@renderer/components/controls/Options.vue";
import Select from "@renderer/components/controls/Select.vue";
import { isFilterEnabled, lobbyFilters, type LobbyFilterKey } from "@renderer/components/lobbies/list/lobby-filters";
import { lobbyFilterEditors, type LobbyFilterEditorContext } from "@renderer/components/lobbies/list/lobby-filter-editors";
import { lobbySorts } from "@renderer/components/lobbies/list/lobby-sorts";
import { cloneLobbyListQuery, DEFAULT_LOBBY_LIST_QUERY, type LobbyListQuery } from "@shared/lobby-list-query";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const props = defineProps<{
    open: boolean;
    query: LobbyListQuery;
    devMode: boolean;
    availableTags: string[];
    availableEngineVersions: string[];
    availableGameVersions: string[];
}>();

const emit = defineEmits<{
    (event: "update:open", open: boolean): void;
    (event: "apply", query: LobbyListQuery): void;
}>();

// Nothing changes until Apply, so the menu works on a copy taken each time it opens.
const draft = ref<LobbyListQuery>(cloneLobbyListQuery(props.query));

watch(
    () => props.open,
    (open) => {
        if (open) draft.value = cloneLobbyListQuery(props.query);
    }
);

// A header click while the menu is open sorts straight away, and the menu should show it.
watch(
    () => props.query.sort,
    (sort) => {
        draft.value.sort = { ...sort };
    }
);

const sortOptions = computed(() => lobbySorts.map((sort) => ({ label: t(sort.labelKey), value: sort.key })));
const orderOptions = computed(() => [
    { label: t("lobby.multiplayer.custom.menu.descending"), value: -1 },
    { label: t("lobby.multiplayer.custom.menu.ascending"), value: 1 },
]);

const editorContext = computed<LobbyFilterEditorContext>(() => ({
    t,
    availableTags: props.availableTags,
    availableEngineVersions: props.availableEngineVersions,
    availableGameVersions: props.availableGameVersions,
}));

const editors = computed(() =>
    lobbyFilters
        .filter((def) => isFilterEnabled(def, props.devMode))
        .flatMap((def) => {
            const editor = lobbyFilterEditors[def.key];
            return editor ? [{ key: def.key, editor }] : [];
        })
);

function setFilter(key: LobbyFilterKey, value: unknown) {
    const filters = draft.value.filters as Record<string, unknown>;
    if (value === undefined) {
        delete filters[key];
    } else {
        filters[key] = value;
    }
}

function reset() {
    draft.value = cloneLobbyListQuery(DEFAULT_LOBBY_LIST_QUERY);
}

function apply() {
    emit("apply", cloneLobbyListQuery(draft.value));
    emit("update:open", false);
}
</script>

<style lang="scss" scoped>
.filter-menu {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    width: 420px;
    max-height: 100%;
}
// Controls stretch by default, which would spread a checkbox across the menu with its icon cell padded out.
.inline > :deep(.control) {
    align-self: flex-start;
}
.body {
    min-height: 0;
    flex: 0 1 auto;
    overflow-y: auto;
}
</style>
