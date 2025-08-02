<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.components.battle.hostBattle.title')" width="400px" @open="onOpen" @close="onClose">
        <div class="flex-col gap-md">
            <template v-if="waitingForBattleCreation">
                <div class="txt-center">{{ t("lobby.components.battle.hostBattle.settingUp") }}</div>
                <Loader :absolutePosition="false"></Loader>
            </template>
            <template v-else>
                <Select
                    v-model="selectedRegion"
                    :options="regions"
                    :label="t('lobby.components.battle.hostBattle.region')"
                    optionLabel="name"
                    optionValue="code"
                    class="fullwidth"
                >
                    <template #value>
                        <div class="flex-row gap-md">
                            <Flag :countryCode="selectedRegion" />
                            <div>{{ selectedRegionName }}</div>
                        </div>
                    </template>

                    <template #option="slotProps">
                        <div class="flex-row gap-md">
                            <Flag :countryCode="slotProps.option.code" />
                            <div>{{ slotProps.option.name }}</div>
                        </div>
                    </template>
                </Select>
                <Button class="blue" @click="hostBattle">{{ t("lobby.components.battle.hostBattle.hostButton") }}</Button>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import Loader from "@renderer/components/common/Loader.vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import Flag from "@renderer/components/misc/Flag.vue";

const { t } = useTypedI18n();

const regions = ref([
    { name: "Europe", code: "EU" },
    { name: "United States", code: "US" },
    { name: "Australia", code: "AU" },
]);
const selectedRegion = ref(regions.value[0].code);
const selectedRegionName = computed(() => regions.value.find((r) => r.code === selectedRegion.value)?.name);

const hostedBattleData: Ref<{ name: string; password: string } | undefined> = ref();

const waitingForBattleCreation = ref(false);

async function hostBattle() {}

function onOpen() {
    waitingForBattleCreation.value = false;
}

function onClose() {
    hostedBattleData.value = undefined;
}
</script>

<style lang="scss" scoped></style>
