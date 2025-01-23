import { auth, me } from "@renderer/store/me.store";
import { SystemServerStatsOkResponseData } from "tachyon-protocol/types";
import { reactive, watch } from "vue";

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
    if (!me.isOnline) return;
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

    window.tachyon.onConnected(() => {
        console.debug("Connected to Tachyon server");
        tachyonStore.isConnected = true;
    });

    window.tachyon.onDisconnected(() => {
        console.debug("Disconnected from Tachyon server");
        tachyonStore.isConnected = false;
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
    let connectInterval;
    watch(
        () => tachyonStore.isConnected,
        (isConnected) => {
            if (isConnected) {
                clearInterval(connectInterval);
            } else {
                connectInterval = setInterval(connect, 10000);
            }
        }
    );

    watch(
        () => me.isOnline,
        (isOnline) => {
            if (isOnline) {
                connect();
            } else {
                window.tachyon.disconnect();
            }
        }
    );

    tachyonStore.isInitialized = true;
}
