// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, type Ref } from "vue";
import type { User } from "@main/model/user";

export const reportUserReasons = ["cheating", "abusiveChat", "griefing", "smurfing", "inappropriateName", "spam", "other"] as const;

export type ReportUserReason = (typeof reportUserReasons)[number];

// Context menus take icons as a class name, so this can't be an icon component.
export const reportUserIconClass = "pi pi-flag report-user-icon";

const isOpen = ref(false);
const reportedUser = ref<User | null>(null);

export function useReportUser() {
    return {
        isOpen: isOpen as Ref<boolean>,
        reportedUser: reportedUser as Ref<User | null>,
        openReportUser(user: User) {
            reportedUser.value = user;
            isOpen.value = true;
        },
        closeReportUser() {
            reportedUser.value = null;
            isOpen.value = false;
        },
    };
}
