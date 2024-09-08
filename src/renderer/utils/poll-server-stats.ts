const invervalMs = 10000;
let intervalId: number | null = null;

export function pollServerStats() {
    if (intervalId) {
        clearInterval(intervalId);
    }

    fetchServerStats();

    intervalId = window.setInterval(fetchServerStats, invervalMs);
}

async function fetchServerStats() {
    try {
        const serverStatsResponse = await api.comms.request("system/serverStats");
        if (serverStatsResponse.status === "success") {
            api.session.serverStats.value = serverStatsResponse.data;
        }
    } catch (err) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }
}
