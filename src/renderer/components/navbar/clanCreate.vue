<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.navbar.clan.create.title')">
        <div class="gridform">
            <div>Name:</div>
            <Textbox v-model="newClanData.name" maxlength="30" style="width: 100%" />
            <div></div>
            <div
                :style="{
                    color: newClanData.name.length >= minClanName && newClanData.name.length <= maxClanName ? 'green' : 'red',
                    fontSize: '0.9em',
                    marginTop: '4px',
                }"
            >
                {{ (newClanData.name ?? "").length }} / {{ minClanName }}-{{ maxClanName }}
            </div>
            <div>Tag:</div>
            <Textbox v-model="newClanData.tag" maxlength="10" style="width: 100%" />
            <div></div>
            <div
                :style="{
                    color: newClanData.tag.length >= minClanTag && newClanData.tag.length <= maxClanTag ? 'green' : 'red',
                    fontSize: '0.9em',
                    marginTop: '4px',
                }"
            >
                {{ (newClanData.tag ?? "").length }} / {{ minClanTag }}-{{ maxClanTag }}
            </div>
            <div>Language: <Flag :countryCode="newClanData.language" style="width: 20px" /></div>
            <Select
                :modelValue="newClanData.language"
                :options="selections"
                optionLabel="name"
                optionValue="value"
                :placeholder="newClanData.language"
                :filter="true"
                @update:model-value="onUpdateSelection"
                style="width: 100%"
            />
            <div>Descrition:</div>
            <Textarea v-model="newClanData.description" maxlength="500" style="width: 100%; min-height: 100%; height: 250px" />
            <div></div>
            <div style="font-size: 0.9em; color: #999; margin-top: 4px">
                {{ (newClanData.description ?? "").length }}/{{ maxClanDescription }}
            </div>
            <div></div>
            <Button v-on:click="clickCreate">Create</Button>
            <div></div>
            <div :style="{ color: clanCreateSuccess ? 'green' : 'red', fontSize: '0.9em', marginTop: '4px' }" v-html="message"></div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();
import Textbox from "@renderer/components/controls/Textbox.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import { clanfuncs } from "@renderer/store/clans.store";
import { ClanCreateRequestData } from "tachyon-protocol/types";

const message = ref("");
const newClanData = ref<ClanCreateRequestData>({
    name: "",
    tag: "",
    language: "??",
    description: "",
});

const selections = ref([
    { name: "International", value: "??" },
    { name: "English", value: "gb" },
    { name: "German", value: "de" },
    { name: "French", value: "fr" },
]);
function onUpdateSelection(newSelection: string) {
    newClanData.value.language = newSelection;
}

const minClanName = 3;
const maxClanName = 30;
const minClanTag = 3;
const maxClanTag = 10;
const maxClanDescription = 500;

const clanCreateSuccess = ref(false);

//RALA Hier muss noch irgendwie implementiert werden das die Werte beim schließen zurückgesetzt werden.
/* watch(isOpen, (newVal) => {
    if (!newVal) {
        newClanData.value = { name: "", tag: "", language: "??", description: "" };
        message.value = "";
    }
}); */

async function clickCreate() {
    if (newClanData.value.name.length < minClanName) {
        message.value = `Clan name must be at least ${minClanName} characters long.`;
        clanCreateSuccess.value = false;
        return;
    }
    if (newClanData.value.tag.length < minClanTag) {
        message.value = `Clan tag must be at least ${minClanTag} characters long.`;
        clanCreateSuccess.value = false;
        return;
    }
    clanCreateSuccess.value = await clanfuncs.createClan(newClanData.value);
    if (clanCreateSuccess.value) {
        newClanData.value = { name: "", tag: "", language: "??", description: "" };
        message.value = "Clan successfully created.";
    } else {
        message.value = "Error creating the clan.<br/>(Name or tag has already been taken!)";
    }
}
</script>
