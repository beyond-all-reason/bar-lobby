<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Directory", order: 0, transition: { name: "slide-left" } } }
</route>
<template>
    <div class="view">
        <div class="clan-dir-container">
            <div class="view-title">
                <h1>{{ t("lobby.views.clanhub.directory.title") }}</h1>
                <p>{{ t("lobby.views.clanhub.directory.description") }}</p>
            </div>
            <div class="flex-row flex-grow gap-md">
                <div class="clan-dir-left-section">
                    <Panel>
                        <div class="flex-col fullheight fullwidth gap-md">
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
                                dataKey="clanId"
                                @row-select="onRowSelect"
                                :rowClass="(data) => (data === selectedClan ? 'clan-dir-highlighted-clan' : '')"
                                @page="onPage"
                                ><template #empty>{{ t("lobby.views.clanhub.directory.noClansFound") }}</template>
                                <Column :header="t('lobby.views.clanhub.directory.tag')">
                                    <template #body="{ data }">{{ data.tag }}</template>
                                </Column>
                                <Column :header="t('lobby.views.clanhub.directory.name')">
                                    <template #body="{ data }">{{ data.name }}</template>
                                </Column>
                                <Column :header="t('lobby.views.clanhub.directory.clanLanguage')">
                                    <template #body="{ data }"
                                        ><img :src="`/src/renderer/assets/images/flags/${data.language}.png`"
                                    /></template>
                                </Column>
                            </DataTable>
                        </div>
                    </Panel>
                </div>
                <div class="clan-dir-right-section">
                    <Panel>
                        <div class="flex-col fullheight fullwidth gap-md">
                            <!--<img
                                class="clan-dir-clan-logo"
                                :alt="t('lobby.views.clanhub.directory.clanlogo')"
                                src="/src/renderer/assets/images/defaultClanLogo.png"
                            />-->
                            <div style="font-size: 72px; font-weight: bold; text-align: right; margin-right: 20px">
                                {{ selectedClan?.tag }}
                            </div>
                            <h2 style="margin-bottom: 0px; padding-bottom: 0px">
                                {{ selectedClan?.name }}
                            </h2>
                            <div style="font-size: medium; color: gray; margin-top: 0px; padding-top: 0px">
                                Member: 0 | Language:
                                <img :src="`/src/renderer/assets/images/flags/${selectedClan?.language ?? 'en'}.png`" />
                            </div>
                            <div class="scroll-container clan-dir-description-field" style="margin-top: 20px">
                                {{ selectedClanDetails?.description }}
                                Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et
                                dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet
                                clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet,
                                consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat,
                                sed diam voluptua. At vero eos et accusam et justo duo dolores et e
                            </div>
                            <Button class="fullwidth clan-dir-details-button">{{ t("lobby.views.clanhub.directory.openClanArea") }}</Button>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Button from "@renderer/components/controls/Button.vue";
import Column from "primevue/column";
import Panel from "@renderer/components/common/Panel.vue";
import SearchBox from "@renderer/components/controls/SearchBox.vue";
import DataTable from "primevue/datatable";
import setup from "./directory.script";

const { t, limit, offset, selectedClan, selectedClanDetails, fulltextSearch, onRowSelect, clans, clansCount, onPage } = setup();
</script>
<style lang="scss" src="./directory.scss" scoped></style>
