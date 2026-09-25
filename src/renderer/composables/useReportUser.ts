// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, type Ref } from "vue";
import type { User } from "@main/model/user";
import type { Message } from "@renderer/model/message";

// Context menus take icons as a class name, so this can't be an icon component.
export const reportUserIconClass = "pi pi-flag-fill report-user-icon";

const isOpen = ref(false);
const reportedUser = ref<User | null>(null);
const reportedMessage = ref<Message | null>(null);

export function useReportUser() {
    return {
        isOpen: isOpen as Ref<boolean>,
        reportedUser: reportedUser as Ref<User | null>,
        reportedMessage: reportedMessage as Ref<Message | null>,
        // Reporting from a message means that message is what is being complained about, so the
        // chat step starts with it already picked.
        openReportUser(user: User, message?: Message) {
            reportedUser.value = user;
            reportedMessage.value = message ?? null;
            isOpen.value = true;
        },
        closeReportUser() {
            reportedUser.value = null;
            reportedMessage.value = null;
            isOpen.value = false;
        },
    };
}
