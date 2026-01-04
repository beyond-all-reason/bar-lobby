<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Directory", order: 0, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="container">
            <div class="view-title">
                <h1>{{ t("lobby.views.clanhub.directory.title") }}</h1>
                <p>{{ t("lobby.views.clanhub.directory.description") }}</p>
            </div>
            <div class="flex-row flex-grow gap-md">
                <div class="middle-section">
                    <Panel>
                        <div class="flex-col fullheight gap-md">
                            <div class="flex-row gap-md fullwidth">
                                <div class="flex-grow">
                                    <SearchBox
                                        v-model="fulltextSearch"
                                        :placeholder="t('lobby.views.clanhub.directory.searchPlaceholder')"
                                    />
                                </div>
                            </div>
                            <DataTable
                                v-model:first="offset"
                                v-model:selection="selectedClan"
                                :lazy="true"
                                :value="clans"
                                :paginator="true"
                                :rows="limit"
                                :totalRecords="clansCount"
                                selectionMode="single"
                                dataKey="id"
                                @row-select="onRowSelect"
                                :rowClass="(data) => (data === selectedClan ? 'highlighted-clan' : '')"
                                @page="onPage"
                                ><template #empty>{{ t("lobby.views.clanhub.directory.noClansFound") }}</template>
                                <Column :header="t('lobby.views.clanhub.directory.tag')">
                                    <template #body="{ data }">{{ data.tag }}</template>
                                </Column>
                                <Column :header="t('lobby.views.clanhub.directory.name')">
                                    <template #body="{ data }">{{ data.name }}</template>
                                </Column>
                            </DataTable>
                        </div>
                    </Panel>
                </div>
                <div class="right-section">
                    <Panel>
                        <div class="card-content right-section flex-col gap-md">
                            <img
                                class="clan-logo"
                                :alt="t('lobby.views.clanhub.directory.clanlogo')"
                                src="/src/renderer/assets/images/defaultClanLogo.png"
                            />
                            <h2>{{ selectedClan?.name || t("lobby.views.clanhub.directory.noClanSelected") }}</h2>
                            <div class="scroll-container flex-grow">
                                <!-- TODO {{ selectedClan?.description || t("lobby.views.clanhub.directory.noDescription") }} -->
                                Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et
                                dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet
                                clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet,
                                consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat,
                                sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no
                                sea takimata sanctus est Lorem ipsum dolor sit amet.
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Column from "primevue/column";
import { useTypedI18n } from "@renderer/i18n";
import Panel from "@renderer/components/common/Panel.vue";
import { Ref, ref, computed, shallowRef } from "vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import DataTable, { DataTablePageEvent } from "primevue/datatable";
import { clansStore } from "@renderer/store/clans.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { ClanBaseData } from "tachyon-protocol/types";

const { t } = useTypedI18n();
const limit = ref(14);
const offset = ref(0);
const selectedClan: Ref<ClanBaseData | null> = shallowRef(null);
const fulltextSearch = ref("");
const fulltextSearchWords = computed(() =>
    fulltextSearch.value
        .split(" ")
        .filter((word) => word.trim() !== "")
        .map((word) => word.toLocaleLowerCase())
);

// Saves the selected clan when a row is selected
function onRowSelect(clan: { data: ClanBaseData }) {
    selectedClan.value = clan.data;
}

// Computes the filtered clans based on the fulltext search
const filteredClans = computed(() => {
    return clansStore.clansBaseData?.filter((clan: ClanBaseData) => fulltextSearchFilter(clan)) || [];
});

// Filters a clan based on the fulltext search words
function fulltextSearchFilter(clan: ClanBaseData) {
    if (!clan) return false; // Return false if clan is null or undefined
    if (fulltextSearchWords.value.length === 0) return true;
    return fulltextSearchWords.value.every((word) => {
        return clan.name.toLowerCase().includes(word) || clan.tag.toLowerCase().includes(word);
    });
}

// Reactive query for clans with dependencies on clansBaseData, fulltextSearch, and offset
const clans = useDexieLiveQueryWithDeps([() => clansStore.clansBaseData, fulltextSearch, offset], () => {
    console.log("Clans updated:", clansStore.clansBaseData);
    console.log("Filtered Clans:", filteredClans.value);
    console.log("Fulltext Search:", fulltextSearch.value);
    console.log("Offset value:", offset.value);
    console.log("Limit value:", limit.value);
    return filteredClans.value.slice(offset.value, offset.value + limit.value);
});

// Reactive query for clans count with dependencies on clansBaseData and fulltextSearch
const clansCount = useDexieLiveQueryWithDeps([() => clansStore.clansBaseData, fulltextSearch], () => {
    console.log("Clans Count updated:", clansCount.value);
    return clansStore.clansBaseData?.length || 0;
});

// Handles pagination event to update the offset
function onPage(event: DataTablePageEvent) {
    offset.value = event.first;
}
</script>

<style lang="scss" scoped>
.container {
    display: flex;
    flex-direction: column;
    height: 100%;
    align-self: center;
}

.middle-section {
    width: 800px;
    height: 700px;
}

.right-section {
    display: flex;
    height: 700px;
    width: 800px;
}

.clan-logo {
    display: block;
    width: 250px;
    height: 250px;
    margin-left: auto; /* Aligns the logo to the right */
    margin-top: -20px; /* Raises the logo slightly */
}

.quick-play-button {
    align-self: center;
    width: 200px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 5px 20px;
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}
:deep(.p-datatable-tbody tr.highlighted-clan td) {
    background: rgba(255, 255, 255, 0.3) !important;
}
:deep(tr.p-highlight) {
    background: rgba(255, 255, 255, 0.1) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
}
:deep(a) {
    pointer-events: auto !important;
    text-decoration: underline;
    color: blue;
    cursor: pointer;
}
.url-button {
    color: blue;
    text-decoration: underline;
    cursor: pointer;
}
.url-button:hover {
    color: lightblue;
}
.textpart,
.url-button {
    display: inline;
    vertical-align: baseline;
    margin-right: 5px; /* Optional spacing between elements */
    white-space: normal; /* Ensure text wraps properly */
    width: auto; /* Prevent 100% width */
}
</style>
