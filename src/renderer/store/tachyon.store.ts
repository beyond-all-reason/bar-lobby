import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { auth, me } from "@renderer/store/me.store";
import { SystemServerStatsOkResponseData } from "tachyon-protocol/types";
import { reactive } from "vue";

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    serverStats: undefined,
    error: undefined,
} as {
    isInitialized: boolean;
    isConnected: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    error?: string;
});

async function connect() {
    if (!me.isAuthenticated) throw new Error("Not authenticated");
    try {
        await window.tachyon.connect();
        tachyonStore.error = undefined;
    } catch (err) {
        console.error("Failed to connect to Tachyon server", err);
        tachyonStore.error = "Error";
        auth.logout();
    }
}

export async function initTachyonStore() {
    tachyonStore.isConnected = await window.tachyon.isConnected();
    console.debug(`Tachyon server is ${tachyonStore.isConnected ? "connected" : "disconnected"}`);

    window.tachyon.onConnected(() => {
        console.debug("Connected to Tachyon server");
        tachyonStore.isConnected = true;
    });

    window.tachyon.onDisconnected(() => {
        console.debug("Disconnected from Tachyon server");
        tachyonStore.isConnected = false;
    });

    window.tachyon.onBattleStart((springString) => {
        console.debug("Received battle start event", springString);
        if (!enginesStore.selectedEngineVersion) {
            console.error("No engine version selected");
            return;
        }
        if (!gameStore.selectedGameVersion) {
            console.error("No game version selected");
            return;
        }
        window.game.launchMultiplayer({
            engineVersion: enginesStore.selectedEngineVersion.id,
            gameVersion: gameStore.selectedGameVersion.gameVersion,
            springString,
        });
    });

    // Periodically fetch server stats
    setInterval(() => {
        if (!tachyonStore.isConnected) return;
        window.tachyon.request("system/serverStats").then((response) => {
            if (response.status === "success") {
                tachyonStore.serverStats = response.data;
            } else {
                console.error("Failed to fetch server stats", response);
            }
        });
    }, 60000);

    // Try to connect to Tachyon server periodically
    setInterval(() => {
        try {
            if (me.isAuthenticated && !tachyonStore.isConnected) connect();
        } catch (err) {
            console.warn("Failed to re-connect to Tachyon server", err);
        }
    }, 10000);

    tachyonStore.isInitialized = true;
}

export const tachyon = { connect };
