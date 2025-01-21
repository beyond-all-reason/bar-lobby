import { CurrentUser } from "@main/model/user";
import { reactive } from "vue";

export const me = reactive<CurrentUser>({
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

// export const me = readonly(_me);
export const auth = { login, playOffline, logout };

export function initMeStore() {}
