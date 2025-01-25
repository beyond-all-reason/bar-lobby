import { Me } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive } from "vue";

export const me = reactive<
    Me & {
        isInitialized: boolean;
        isAuthenticated: boolean;
    }
>({
    isInitialized: false,
    userId: "0",
    clanId: null,
    partyId: null,
    countryCode: "",
    displayName: "",
    status: "offline",
    isAuthenticated: false,
    username: "Player",
    battleRoomState: {},
    outgoingFriendRequestUserIds: new Set<number>(),
    incomingFriendRequestUserIds: new Set<number>(),
    friendUserIds: new Set<number>(),
    ignoreUserIds: new Set<number>(),
    permissions: new Set<string>(),
});

async function login() {
    try {
        await window.auth.login();
        me.isAuthenticated = true;
    } catch (e) {
        console.error(e);
        me.isAuthenticated = false;
    }
}

function playOffline() {
    me.isAuthenticated = false;
}

async function logout() {
    await window.auth.logout();
    me.isAuthenticated = false;
}

async function changeAccount() {
    await window.auth.wipe();
    me.isAuthenticated = false;
}

window.tachyon.onEvent("user/updated", (event) => {
    console.log(`Received user/updated event: ${JSON.stringify(event)}`);

    // TODO change this when we have a proper protocol for users
    // see https://github.com/beyond-all-reason/tachyon/blob/master/docs/schema/user.md
    const myData = event.users[0];
    if (myData) {
        Object.assign(me, myData);
    }
});

// export const me = readonly(_me);
export const auth = { login, playOffline, logout, changeAccount };

export async function initMeStore() {
    await db.users
        .where({ isMe: 1 })
        .first()
        .then((user) => {
            if (user) {
                Object.assign(me, user);
            }
        });
    const hasCredentials = await window.auth.hasCredentials();
    if (hasCredentials) {
        await login();
    }
    me.isInitialized = true;
}
