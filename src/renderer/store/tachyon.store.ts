import { me } from "@renderer/store/me.store";
import { TachyonEvent } from "tachyon-protocol";
import { SystemServerStatsOkResponseData } from "tachyon-protocol/types";
import { reactive, watch } from "vue";

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    serverStats: undefined,
    lastEvent: undefined,
} as {
    isInitialized: boolean;
    isConnected: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    lastEvent?: TachyonEvent;
});

export function initTachyonStore() {
    window.tachyon.onConnected(() => {
        console.debug("Connected to Tachyon server");
        tachyonStore.isConnected = true;
    });

    window.tachyon.onDisconnected(() => {
        console.debug("Disconnected from Tachyon server");
        tachyonStore.isConnected = false;
    });

    window.tachyon.onEvent((event) => {
        console.debug("Tachyon event", event);
        tachyonStore.lastEvent = event;
    });

    // Periodically fetch server stats
    setInterval(() => {
        if (!tachyonStore.isConnected) return;
        window.tachyon.req("system/serverStats").then((response) => {
            if (response.status === "success") {
                tachyonStore.serverStats = response.data;
            } else {
                console.error("Failed to fetch server stats", response);
            }
        });
    }, 60000);

    watch(
        () => me.isOnline,
        (isOnline) => {
            if (isOnline) {
                window.tachyon.connect();
            } else {
                window.tachyon.disconnect();
            }
        }
    );

    tachyonStore.isInitialized = true;
}
