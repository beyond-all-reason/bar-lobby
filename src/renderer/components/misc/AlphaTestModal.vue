<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal v-model="isOpen" :title="t('lobby.components.misc.alphaTest.title')">
        <div class="container flex-col gap-md">
            <p>{{ message }}</p>
            <p v-if="expectedUntil">{{ t("lobby.components.misc.alphaTest.expectedUntil", { date: expectedUntil }) }}</p>
            <p class="server">{{ t("lobby.components.misc.alphaTest.serverLabel", { server: test.serverUrl }) }}</p>
            <div class="flex-row flex-center-items gap-md">
                <Checkbox v-model="remember" />
                <span>{{ t("lobby.components.misc.alphaTest.remember") }}</span>
            </div>
            <div class="flex-row flex-center padding-top-lg gap-xl">
                <Button class="green fullwidth" @click="onJoin">{{ t("lobby.components.misc.alphaTest.join") }}</Button>
                <Button class="red fullwidth" @click="onDecline">{{ t("lobby.components.misc.alphaTest.decline") }}</Button>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import { useTypedI18n, type TranslationKey } from "@renderer/i18n";
import { settingsStore } from "@renderer/store/settings.store";
import { configStore } from "@renderer/store/config.store";
import { joinAlphaTest, leaveAlphaTest, type AlphaTest } from "@shared/alpha-test";

const { t, te } = useTypedI18n();

const props = defineProps<{ test: AlphaTest }>();
const emit = defineEmits<{ (e: "done"): void }>();

const remember = ref(false);

// Closing the modal is a "not now".
const isOpen = computed({
    get: () => true,
    set: (open: boolean) => {
        if (!open) onDecline();
    },
});

// Keys come from the remote config, which may name one added after this release.
const message = computed(() => {
    const key = `lobby.components.misc.alphaTest.messages.${props.test.messageKey}`;
    return te(key) ? t(key as TranslationKey) : t("lobby.components.misc.alphaTest.messages.generic");
});

const expectedUntil = computed(() => {
    if (!props.test.endsAt) return undefined;
    const date = new Date(props.test.endsAt);
    if (Number.isNaN(date.getTime())) return undefined;
    const options: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" };
    try {
        return new Intl.DateTimeFormat(settingsStore.language ?? undefined, options).format(date);
    } catch {
        // The language setting can hold a locale Intl doesn't accept, like the scrambled "dev" one.
        return new Intl.DateTimeFormat(undefined, options).format(date);
    }
});

function onJoin() {
    joinAlphaTest(settingsStore, props.test.serverUrl, configStore.defaultServers);
    if (remember.value) settingsStore.alphaTestChoice = "join";
    emit("done");
}

function onDecline() {
    leaveAlphaTest(settingsStore, props.test.serverUrl);
    if (remember.value) settingsStore.alphaTestChoice = "decline";
    emit("done");
}
</script>

<style lang="scss" scoped>
.container {
    max-width: 480px;
}

.server {
    font-family: monospace;
    opacity: 0.8;
}
</style>
