<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->
<template>
    <Modal :title="t('lobby.navbar.clan.create.title')" @open="openModal">
        <div class="gridform">
            <div>Name:</div>
            <Textbox
                v-model="newClanData.name"
                :placeholder="t('lobby.navbar.clan.create.formPlaceholderClanName')"
                maxlength="30"
                class="full-width"
            />
            <div></div>
            <div
                :class="[
                    newClanData.name.length >= minClanName && newClanData.name.length <= maxClanName ? 'valid' : 'invalid',
                    'text-style',
                ]"
            >
                {{ (newClanData.name ?? "").length }}/{{ maxClanName }}
            </div>
            <div>Tag:</div>
            <Textbox
                v-model="newClanData.tag"
                :placeholder="t('lobby.navbar.clan.create.formPlaceholderClanTag')"
                maxlength="10"
                class="full-width"
            />
            <div></div>
            <div
                :class="[newClanData.tag.length >= minClanTag && newClanData.tag.length <= maxClanTag ? 'valid' : 'invalid', 'text-style']"
            >
                {{ (newClanData.tag ?? "").length }}/{{ maxClanTag }}
            </div>
            <div>Language: <Flag :countryCode="newClanData.language" class="flag-icon" /></div>
            <Select
                :modelValue="newClanData.language"
                :options="selections"
                optionLabel="name"
                optionValue="value"
                :placeholder="newClanData.language"
                :filter="true"
                @update:model-value="onUpdateSelection"
                class="full-width"
            />
            <div>Descrition:</div>
            <Textarea
                v-model="newClanData.description"
                :placeholder="t('lobby.navbar.clan.create.formPlaceholderClanDescription')"
                maxlength="500"
                class="textarea-style"
                style="min-height: 100%"
            />
            <div></div>
            <div
                :class="[
                    (newClanData.description ?? '').length >= minClanDescription &&
                    (newClanData.description ?? '').length <= maxClanDescription
                        ? 'valid'
                        : 'invalid',
                    'text-style',
                ]"
            >
                {{ (newClanData.description ?? "").length }}/{{ maxClanDescription }}
            </div>
            <div></div>
            <Button v-on:click="clickCreate">Create</Button>
            <div></div>
            <div :class="clanCreateSuccess ? 'success-message' : 'error-message'" v-html="message"></div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref } from "vue";
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

// Available languages for clans
const selections = ref([
    { name: "International", value: "??" },
    { name: "English", value: "gb" },
    { name: "German", value: "de" },
    { name: "French", value: "fr" },
]);

// Update event if user select a new language
function onUpdateSelection(newSelection: string) {
    newClanData.value.language = newSelection;
}

// Min/Max values to prevent input errors
const minClanName = 3;
const maxClanName = 30;
const minClanTag = 3;
const maxClanTag = 10;
const minClanDescription = 0;
const maxClanDescription = 500;

// Handle clan create click event with error handling
const clanCreateSuccess = ref(false);
async function clickCreate() {
    if (newClanData.value.name.length < minClanName) {
        message.value = t("lobby.navbar.clan.create.clanNameLengthError", { min: minClanName });
        clanCreateSuccess.value = false;
        return;
    }
    if (newClanData.value.tag.length < minClanTag) {
        message.value = t("lobby.navbar.clan.create.clanTagLengthError", { min: minClanTag });
        clanCreateSuccess.value = false;
        return;
    }
    clanCreateSuccess.value = await clanfuncs.createClan(newClanData.value);
    if (clanCreateSuccess.value) {
        newClanData.value = { name: "", tag: "", language: "??", description: "" };
        message.value = t("lobby.navbar.clan.create.clanCreateSuccessMessage");
    } else {
        message.value = t("lobby.navbar.clan.create.clanCreateErrorMessage");
    }
}

// Reset form if modal is opened
function openModal() {
    newClanData.value = { name: "", tag: "", language: "??", description: "" };
    message.value = "";
    clanCreateSuccess.value = false;
}
</script>

<style scoped>
.full-width {
    width: 100%;
}
.valid {
    color: green;
}
.invalid {
    color: red;
}
.text-style {
    font-size: 0.9em;
    margin-top: 4px;
}
.flag-icon {
    width: 20px;
}
.textarea-style {
    width: 100%;
    height: 250px;
}
.success-message {
    color: green;
    font-size: 0.9em;
    margin-top: 4px;
}
.error-message {
    color: red;
    font-size: 0.9em;
    margin-top: 4px;
}
</style>
