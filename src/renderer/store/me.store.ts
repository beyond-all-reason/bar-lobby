import { CurrentUser } from "@main/model/user";
import { reactive, readonly } from "vue";

export const _me = reactive({
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
} as CurrentUser);

async function login() {
    await window.auth.login();
    _me.isOnline = true;
}

function playOffline() {
    _me.isOnline = false;
}

function logout() {
    window.auth.logout();
    _me.isOnline = false;
}

export const me = readonly(_me);
export const auth = { login, playOffline, logout };
