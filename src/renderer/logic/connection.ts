// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { watch } from "vue";
import { UserId } from "tachyon-protocol/types";
import { authApi } from "@renderer/api/auth";
import { withoutIpcCallError } from "@renderer/api/ipc-call";
import { networkApi } from "@renderer/api/network";
import { tachyonConnectionApi, tachyonRequest } from "@renderer/api/tachyon";
import { ui } from "@renderer/logic/ui";
import { battleHistoryActions } from "@renderer/store/battleHistory.store";
import { configStore } from "@renderer/store/config.store";
import { connectionActions, connectionStore } from "@renderer/store/connection.store";
import { friends } from "@renderer/store/me.store";
import { settingsStore } from "@renderer/store/settings.store";
import { subsManager } from "@renderer/store/users.store";
import { onTachyonConnected } from "@renderer/utils/connection-signal";
import { onWentOffline } from "@renderer/utils/offline-signal";
import { resolveLobbyServer } from "@shared/lobby-server";

let isInitialized = false;
let reconnectTimer: ReturnType<typeof setInterval> | undefined;
let serverStatsTimer: ReturnType<typeof setInterval> | undefined;

async function rejectingWithCause<T>(call: Promise<T>) {
    try {
        return await call;
    } catch (error) {
        throw withoutIpcCallError(error);
    }
}

// The main process owns the session. Nothing here assigns isAuthenticated
// directly, or the UI can end up claiming a session that no longer exists.
async function syncAuthState() {
    const { authenticated } = await rejectingWithCause(authApi.getState());
    connectionActions.set({ isAuthenticated: authenticated });
}

async function login(interactive = true) {
    try {
        await rejectingWithCause(authApi.login(interactive));
    } finally {
        // The change event and this reply are separate channels, so read the
        // state back rather than racing them.
        await syncAuthState();
    }
}

async function connect() {
    if (!connectionStore.isAuthenticated) throw new Error("Not authenticated");

    try {
        await tachyonConnectionApi.connect();
        connectionActions.set({ error: undefined });
    } catch (error) {
        const cause = withoutIpcCallError(error);
        connectionActions.set({ error: "Error" });

        throw new Error(cause instanceof Error ? cause.message : String(cause));
    }
}

// Signing in and opening the socket are separate steps, and starting offline
// leaves the first one undone, so going online has to cover both.
async function goOnline() {
    if (!connectionStore.isAuthenticated) {
        await login(false);
    }

    await connect();
}

function stopReconnecting() {
    if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = undefined;
        connectionActions.set({ isReconnecting: false });
    }
}

function startReconnecting() {
    stopReconnecting();
    reconnectTimer = setInterval(() => {
        // A tick can already be queued when the user cancels, and connect() would
        // set wantsConnection straight back to true.
        if (!connectionStore.isAuthenticated || !connectionStore.wantsConnection) {
            stopReconnecting();

            return;
        }

        connect().catch(() => {
            // Already logged and surfaced via connectionStore.error; keep retrying.
        });
    }, 10000);
    connectionActions.set({ isReconnecting: true });
}

async function fetchServerStats() {
    try {
        connectionActions.set({ error: undefined });
        const response = await tachyonRequest("system/serverStats");
        connectionActions.set({ serverStats: response.data });
    } catch {
        connectionActions.set({ error: "Error fetching server stats", serverStats: undefined });
    }
}

function stopFetchingServerStats() {
    if (serverStatsTimer) {
        clearInterval(serverStatsTimer);
        serverStatsTimer = undefined;
    }
}

// The server keeps a session alive across a dropped socket, so a close on its own
// tells us nothing about whether the user is still in a party, lobby or queue.
// Choosing to go offline is what ends it, and this is the only path that throws
// away what the server last told us.
//
// Clearing the timer leaves any handshake already in flight running, which would
// connect after the user asked it to stop, so this has to reach the socket too.
// Dropping wantsConnection is what stops the close being treated as a fault.
async function goOffline() {
    connectionActions.set({ wantsConnection: false });
    stopReconnecting();
    await rejectingWithCause(tachyonConnectionApi.disconnect());

    // Closing the socket only starts the handshake, so the close event lands after
    // this resolves and the store would still read as connected. Settling it here
    // keeps the cleanup below from asking a dying socket to unsubscribe, and drops
    // any error left over from a stats poll so the status reads offline rather
    // than faulted. The later close event finds nothing to do.
    connectionActions.set({ isConnected: false, error: undefined });
    stopFetchingServerStats();

    onWentOffline.dispatch();
}

async function logout() {
    battleHistoryActions.clearBattleHistory();
    await goOffline();
    await rejectingWithCause(authApi.logout());
    await syncAuthState();
}

// The same setting picks the websocket and the authorization server, so the
// credentials we are holding were issued by the server being left and are worth
// nothing to the one being joined. Switching ends the session rather than moving
// the socket over, and logout is already that: it gives up wanting a connection
// before closing one, so the drop is not taken for a fault worth retrying.
async function serverChanged() {
    await logout();
}

// Multiplayer is behind devMode, so outside it there is no session to restore.
async function restorePreviousSession() {
    if (!settingsStore.devMode) return;
    if (!settingsStore.loginAutomatically) return;
    if (!(await rejectingWithCause(authApi.hasCredentials()))) return;

    try {
        // Non-interactive, because a rejected refresh token must not open a
        // browser window while the user is still looking at the loading screen.
        await goOnline();
    } catch (error) {
        // Deliberately keeps the credentials. Whatever went wrong here, only main
        // can tell a rejected refresh token from a server that was unreachable,
        // and it already destroys the account in the first case. Signing out from
        // here as well threw away working credentials over a laptop that woke up
        // before its wifi did. Signed in and not connected is a state the status
        // menu can get you out of.
        console.warn("Could not restore the previous session, continuing offline", error);

        return;
    }

    try {
        await friends.fetchFriendList();
    } catch (error) {
        console.warn("Could not fetch the friend list", error);
    }
}

async function restoreSession() {
    await syncAuthState();
    await restorePreviousSession();
}

function onConnected() {
    console.debug("Connected to Tachyon server");
    // Recorded here rather than in connect(), so it holds however the
    // connection was opened. Setting it at one call site meant the others
    // silently opted out of reconnecting.
    connectionActions.set({ isConnected: true, wantsConnection: true });
    fetchServerStats();
    stopFetchingServerStats();
    stopReconnecting();
    serverStatsTimer = setInterval(fetchServerStats, 60000);

    onTachyonConnected.dispatch();
}

function onDisconnected() {
    console.debug("Disconnected from Tachyon server");
    // Every failed reconnect attempt builds a socket that closes, so this fires again on each
    // retry. Only the first one is a real transition worth reacting to.
    const wasConnected = connectionStore.isConnected;
    connectionActions.set({ isConnected: false });
    if (!wasConnected) return;

    stopFetchingServerStats();
    // A close the user asked for is not a fault, so it gets no retry.
    // wantsConnection is the only thing consulted here: pairing it with a
    // second flag meant the two could disagree about whether a close was
    // deliberate. The overlay that goes up with the retries is what tells the
    // user, so there is no alert either.
    if (connectionStore.wantsConnection) {
        startReconnecting();
    }
}

// A network that goes away produces no close event, so on its own the socket
// sits there looking alive until the silence timer gives up half a minute
// later. This only covers the interface disappearing, so the timer is still
// what catches a server that has stopped answering.
function onNetworkOffline() {
    if (!connectionStore.isConnected) return;

    console.debug("Network went away, dropping the connection");
    void rejectingWithCause(tachyonConnectionApi.dropConnection());
}

function onAuthChanged({ authenticated }: { authenticated: boolean }) {
    // Losing the session is not something to retry through, whoever ended it, so
    // the intent goes with it rather than being cleared at each call site.
    if (!authenticated) {
        connectionActions.set({ wantsConnection: false });
        stopReconnecting();
    }

    connectionActions.set({ isAuthenticated: authenticated });
}

async function onUsersAttached(users: UserId[]) {
    if (!connectionStore.isConnected) return;

    try {
        const response = await tachyonRequest("user/subscribeUpdates", { userIds: users });
        console.log("Tachyon: user/subscribeUpdates", response);
    } catch {
        ui.userSubscribeFailed();
    }
}

async function onUsersDetached(users: UserId[]) {
    // Dropping the connection detaches everything, and telling a server we
    // just lost that we're unsubscribing only produces an error for the user.
    if (!connectionStore.isConnected) return;

    try {
        const response = await tachyonRequest("user/unsubscribeUpdates", { userIds: users });
        console.log("Tachyon: user/unsubscribeUpdates", response);
    } catch {
        ui.userUnsubscribeFailed();
    }
}

function watchServer() {
    // Settings and config load in parallel with this, and either arriving counts
    // as a change. Reacting to that would sign out everyone who does not use the
    // default server, every launch. Each store sets its data and isInitialized in
    // the same tick, so checking the flags when the watcher fires is too late; the
    // server only counts as known once both are in, and becoming known isn't a
    // switch. Watching the resolved server rather than the override means clearing
    // an override that names the default changes nothing.
    watch(
        () =>
            settingsStore.isInitialized && configStore.isInitialized
                ? resolveLobbyServer(settingsStore.useDefaultServer, settingsStore.lobbyServerOverride, configStore.defaultServers ?? [])
                : undefined,
        (server, previous) => {
            if (server === undefined || previous === undefined) return;

            void serverChanged();
        }
    );
}

export async function initConnectionLogic() {
    if (isInitialized) {
        console.warn("Connection logic is already initialized. Skipping initialization.");

        return;
    }

    const isConnected = await rejectingWithCause(tachyonConnectionApi.isConnected());
    connectionActions.set({ isConnected });
    if (isConnected) {
        fetchServerStats();
        serverStatsTimer = setInterval(fetchServerStats, 60000);
    }
    console.debug(`Tachyon server is ${isConnected ? "connected" : "disconnected"}`);

    tachyonConnectionApi.onConnected(onConnected);
    tachyonConnectionApi.onDisconnected(onDisconnected);
    networkApi.onOffline(onNetworkOffline);
    authApi.onChanged(onAuthChanged);
    subsManager.onNewUsersAttached.add(onUsersAttached);
    subsManager.onOldUsersDetached.add(onUsersDetached);
    watchServer();

    isInitialized = true;
}

export const connectionLogic = {
    login,
    goOnline,
    logout,
    connect,
    goOffline,
    restoreSession,
};
