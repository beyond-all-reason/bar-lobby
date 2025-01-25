import { User } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive } from "vue";

export const usersStore = reactive<{
    isInitialized: boolean;
    users: Array<User>;
}>({
    isInitialized: false,
    users: [],
});

// need a lot of work protocol side
// see https://github.com/beyond-all-reason/tachyon/blob/master/docs/schema/user.md
export function initUsersStore() {
    if (usersStore.isInitialized) return;
    window.tachyon.onEvent("user/updated", (event) => {
        console.debug(`Received user/updated event: ${JSON.stringify(event)}`);
        const users = event.users.map((user) => {
            return {
                userId: user.userId || "",
                username: user.username || "",
                countryCode: user.countryCode || "",
                status: user.status || "offline",
                displayName: user.displayName || "",
                clanId: user.clanId || null,
                partyId: user.partyId || null,
                scopes: user.scopes || [],
                battleRoomState: {},
                isMe: 1, // TODO unweirdify this after we have a proper protocol for users
            } as User;
        });
        db.users.bulkPut(users);
    });
    usersStore.isInitialized = true;
}
