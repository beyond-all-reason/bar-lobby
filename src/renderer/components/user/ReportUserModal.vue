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
            <div>{{ t("lobby.components.user.reportUser.blurb") }}</div>
            <Select
                v-model="reason"
                :options="reasonOptions"
                optionLabel="label"
                optionValue="value"
                :label="t('lobby.components.user.reportUser.reason')"
                :placeholder="t('lobby.components.user.reportUser.reasonPlaceholder')"
            />
            <Textarea
                v-model="message"
                :placeholder="t('lobby.components.user.reportUser.messagePlaceholder')"
                :rows="6"
                :maxlength="1000"
                @keydown.enter.stop
            />
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
import { reportUserReasons, useReportUser, type ReportUserReason } from "@renderer/composables/useReportUser";
import { users } from "@renderer/store/users.store";

const { t } = useTypedI18n();
const { isOpen, reportedUser, closeReportUser } = useReportUser();

const reason = ref<ReportUserReason | null>(null);
const message = ref("");
const isSubmitting = ref(false);

const reasonOptions = computed(() =>
    reportUserReasons.map((value) => ({
        value,
        label: t(`lobby.components.user.reportUser.reasons.${value}`),
    }))
);

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
</style>
