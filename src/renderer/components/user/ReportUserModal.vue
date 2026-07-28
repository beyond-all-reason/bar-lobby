<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal v-model="isOpen" @submit="submit">
        <template #title>
            <div class="flex-row flex-center-items gap-sm">
                <ReportUserIcon />
                {{ t("lobby.components.user.reportUser.title", { username: reportedUser?.username }) }}
            </div>
        </template>
        <div class="container flex-col gap-md">
            <div>
                {{ t("lobby.components.user.reportUser.blurb") }}
                <ul>
                    <li>{{ t("lobby.components.user.reportUser.guidanceDescription") }}</li>
                    <li>{{ t("lobby.components.user.reportUser.guidanceReplay") }}</li>
                    <li>{{ t("lobby.components.user.reportUser.guidanceTimestamps") }}</li>
                </ul>
            </div>
            <Select
                v-model="reason"
                :options="reasonGroups"
                optionGroupLabel="label"
                optionGroupChildren="reasons"
                optionLabel="label"
                optionValue="value"
                :label="t('lobby.components.user.reportUser.reason')"
                :placeholder="t('lobby.components.user.reportUser.reasonPlaceholder')"
            />
            <Textarea
                v-model="message"
                :placeholder="t('lobby.components.user.reportUser.messagePlaceholder')"
                :rows="5"
                :maxlength="maxMessageLength"
                @keydown.enter.stop
            />
            <div class="note">{{ t("lobby.components.user.reportUser.specCheatingNote") }}</div>
            <Button class="fullwidth green" :disabled="!canSubmit" @click="submit">
                {{ t("lobby.components.user.reportUser.submit") }}
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import ReportUserIcon from "@renderer/components/user/ReportUserIcon.vue";
import { notificationsApi } from "@renderer/api/notifications";
import { useTypedI18n } from "@renderer/i18n";
import { useReportUser } from "@renderer/composables/useReportUser";
import { users } from "@renderer/store/users.store";

// Reasons and the 255 character limit come from the moderation report the website submits,
// which stores a type ("chat", "actions") and a sub type ("spam", "griefing", ...) per report.
const maxMessageLength = 255;

const { t } = useTypedI18n();
const { isOpen, reportedUser, closeReportUser } = useReportUser();

const reason = ref<string | null>(null);
const message = ref("");
const isSubmitting = ref(false);

const reasonGroups = computed(() => [
    {
        label: t("lobby.components.user.reportUser.sections.chat"),
        reasons: [
            { value: "chat/spam", label: t("lobby.components.user.reportUser.reasons.chat.spam") },
            { value: "chat/bullying", label: t("lobby.components.user.reportUser.reasons.chat.bullying") },
            { value: "chat/hate", label: t("lobby.components.user.reportUser.reasons.chat.hate") },
            { value: "chat/other", label: t("lobby.components.user.reportUser.reasons.chat.other") },
        ],
    },
    {
        label: t("lobby.components.user.reportUser.sections.actions"),
        reasons: [
            { value: "actions/noob", label: t("lobby.components.user.reportUser.reasons.actions.noob") },
            { value: "actions/griefing", label: t("lobby.components.user.reportUser.reasons.actions.griefing") },
            { value: "actions/cheating", label: t("lobby.components.user.reportUser.reasons.actions.cheating") },
            { value: "actions/other", label: t("lobby.components.user.reportUser.reasons.actions.other") },
        ],
    },
]);

const canSubmit = computed(() => Boolean(reportedUser.value && reason.value && message.value.trim() && !isSubmitting.value));

watch(isOpen, (open) => {
    reason.value = null;
    message.value = "";
    isSubmitting.value = false;

    if (!open) {
        reportedUser.value = null;
    }
});

async function submit() {
    if (!canSubmit.value) return;

    isSubmitting.value = true;
    const reported = await users.requestReportUsers({
        userIds: [reportedUser.value!.userId],
        reason: { type: reason.value! },
        message: message.value.trim(),
    });
    isSubmitting.value = false;

    if (!reported) return;

    notificationsApi.alert({ text: t("lobby.components.user.reportUser.submitted"), severity: "info" });
    closeReportUser();
}
</script>

<style lang="scss" scoped>
.container {
    width: 480px;
    padding: 10px;
}
ul {
    padding-left: 20px;
    list-style: disc;
}
.note {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
}
</style>
