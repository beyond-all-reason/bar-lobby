<route lang="json5">
{ meta: { empty: true, blurBg: true, transition: { name: "login" } } }
</route>

<template>
    <div class="container">
        <img ref="logo" class="logo" src="/images/BARLogoFull.png" />

        <div v-if="state === 'connecting'" class="relative">
            <Loader></Loader>
        </div>

        <div v-else-if="state === 'login_method'" class="relative flex-col gap-md">
            <p class="txt-center">Please choose login method..</p>
            <Button class="gap-sm" @click="connect">> BAR Account </Button>
            <Button class="gap-sm" @click="playOffline">> Play Offline </Button>
        </div>

        <div v-else-if="state === 'waiting_for_auth'" class="relative flex-col gap-md">
            <p class="txt-center">Please authenticate via your web browser.</p>
            <Button class="retry gap-sm" @click="connect">
                <Icon :icon="replayIcon" />
                Retry
            </Button>
        </div>

        <div v-else-if="state === 'error'" class="flex-col gap-md">
            <div class="txt-error txt-center">{{ error }}</div>
            <Button class="retry gap-sm" @click="connect">
                <Icon :icon="replayIcon" />
                Reconnect
            </Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import replayIcon from "@iconify-icons/mdi/replay";
import { ipcRenderer, shell } from "electron";
import { delay } from "jaz-ts-utils";
import { ref, watch, onMounted } from "vue";

import Loader from "@/components/common/Loader.vue";
import Button from "@/components/controls/Button.vue";
import { pollServerStats } from "@/utils/poll-server-stats";

const serverAddress = `${api.comms.config.host}:${api.comms.config.port}`;
const state = ref<"login_method" | "connecting" | "waiting_for_auth" | "connected" | "error">("login_method");
const error = ref("");

async function connect() {
    try {
        state.value = "connecting";

        let oauthToken: Awaited<ReturnType<typeof api.comms.auth>> | undefined;

        if (api.settings.model.useSteamAuth) {
            const steamSessionTicket: string | null = await ipcRenderer.invoke("get-steam-session-ticket");
            state.value = "connecting";
            oauthToken = await steamAuth(steamSessionTicket);
        } else {
            state.value = "waiting_for_auth";
            oauthToken = await api.comms.auth({ open: shell.openExternal });
        }

        // TODO: store token
        api.session.bearerToken.value = oauthToken.accessToken;

        await api.comms.connect(oauthToken.accessToken);

        // Not implemented yet
        //const userResponse = await api.comms.nextEvent("privateUser/add");
        //pollServerStats();
        //api.session.updateCurrentUser(userResponse.user);

        api.comms.isConnectedRef.value = true;
        api.session.offlineMode.value = false;

        api.comms.socket?.addEventListener("close", () => {
            api.comms.isConnectedRef.value = false;

            api.session.clear();

            if (
                api.router.currentRoute.value.path !== "/" &&
                api.router.currentRoute.value.path !== "/login" &&
                !api.session.offlineMode.value
            ) {
                api.router.replace("/login");
            }
        });

        state.value = "connected";

        await api.router.push("/home");
    } catch (err) {
        state.value = "error";
        if (err instanceof Error) {
            if (
                err.message.includes("ECONNREFUSED") ||
                err.message.includes("fetch failed") ||
                err.message.includes("ERR_CONNECTION_REFUSED") ||
                err.message.includes("Failed to fetch")
            ) {
                error.value = `Could not connect to server at ${api.comms.getServerBaseUrl()}`;
            } else {
                error.value = err.message;
                console.error(err);
            }
        } else {
            error.value = "An unknown error occurred when trying to connect to the server.";
            console.error(err);
        }
    }

    await delay(100);
}

async function playOffline() {
    api.session.offlineMode.value = true;
    api.comms.disconnect();
    await api.router.push("/singleplayer/custom");
}

async function steamAuth(steamSessionTicket: string): Promise<ReturnType<typeof api.comms.auth>> {
    console.log(steamSessionTicket);
    try {
        const token = await api.comms.auth({ steamSessionTicket: steamSessionTicket });
        return token;
    } catch (err) {
        if (err instanceof Error && err.message.includes("user_not_found")) {
            const username = await promptUsername();
            await api.comms.register({ steamSessionTicket, username });
            return await steamAuth(steamSessionTicket);
        } else {
            throw err;
        }
    }
}

async function promptUsername(): Promise<string> {
    return "bob";
}

onMounted(async () => {
    if (api.settings.model.loginAutomatically) {
        await connect();
    } else {
        state.value = "login_method";
    }
});
</script>

<style lang="scss" scoped>
.container {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: calc((100vh - 900px) / 2);
    width: 500px;
    margin-left: auto;
    margin-right: auto;
}

.logo {
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    margin-bottom: 80px;
}

.login-forms {
    width: 100%;
    :deep(.content) {
        padding: 0;
    }
}

.retry {
    align-self: center;
}

.play-offline {
    display: flex;
    align-self: center;
    margin-top: 20px;
    font-size: 16px;
    opacity: 0.3;
    &:hover {
        opacity: 1;
    }
}
</style>
