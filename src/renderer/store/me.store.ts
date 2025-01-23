import { CurrentUser } from "@main/model/user";
import { reactive } from "vue";

export const me = reactive<
    CurrentUser & {
        isInitialized: boolean;
    }
>({
    isInitialized: false,
    userId: 0,
    isOnline: false,
    username: "Player",
    battleRoomState: {},
    outgoingFriendRequestUserIds: new Set<number>(),
    incomingFriendRequestUserIds: new Set<number>(),
    friendUserIds: new Set<number>(),
    ignoreUserIds: new Set<number>(),
    permissions: new Set<string>(),
    icons: {},
    clanId: null,
    countryCode: "",
    status: "offline",
});

async function login() {
    await window.auth.login();
    me.isOnline = true;
}

function playOffline() {
    me.isOnline = false;
}

async function logout() {
    await window.auth.logout();
    me.isOnline = false;
}

async function changeAccount() {
    await window.auth.wipe();
    me.isOnline = false;
}

window.tachyon.onEvent("user/updated", (event) => {
    console.log(`Received user/updated event: ${JSON.stringify(event)}`);
    // const users = event.users;
    // const meUser = users.find((user) => user.userId === me.userId);
    // if (me) {
    //     Object.assign(me, meUser);
    // }
});

// export const me = readonly(_me);
export const auth = { login, playOffline, logout, changeAccount };

export function initMeStore() {
    me.isInitialized = true;
}
