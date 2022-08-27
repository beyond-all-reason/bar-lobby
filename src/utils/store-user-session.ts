import { Static } from "@sinclair/typebox";
import type { myUserSchema } from "tachyon-client";

export function storeUserSession(userData?: Static<typeof myUserSchema>) {
    if (!userData) {
        console.warn("User data is null");
        return;
    }

    api.session.updateCurrentUser(userData);

    api.session.offlineMode.value = false;
}
