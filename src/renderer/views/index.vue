<route lang="json5">
{ meta: { empty: true, blurBg: true, transition: { name: "fade" } } }
</route>

<template>
    <div class="container">
        <img ref="logo" class="logo" src="/src/renderer/assets/images/BARLogoFull.png" />
        <Transition mode="out-in" name="fade">
            <div v-if="connecting" class="relative">
                <Loader></Loader>
            </div>
            <div v-else class="buttons-container">
                <button class="login-button" @click="login">Login</button>
                <div v-if="hasCredentials" class="play-offline" @click="changeAccount">Change account</div>
                <div v-if="error" class="txt-error">{{ error }}</div>
                <div class="play-offline" @click="playOffline">Play Offline</div>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Loader from "@renderer/components/common/Loader.vue";
import { useRouter } from "vue-router";
import { auth } from "@renderer/store/me.store";
import { settingsStore } from "@renderer/store/settings.store";
import { tachyon } from "@renderer/store/tachyon.store";

const router = useRouter();

const connecting = ref(false);
const error = ref<string>();

const hasCredentials = await window.auth.hasCredentials();

async function login() {
    try {
        connecting.value = true;
        await auth.login();
        await tachyon.connect();
        router.push("/home/overview");
    } catch (e) {
        console.error(e);
        error.value = (e as Error).message;
    } finally {
        // Removes the stutter when transitioning to the next page
        setTimeout(() => {
            connecting.value = false;
        }, 1000);
    }
}

async function changeAccount() {
    await auth.changeAccount();
    login();
}

async function playOffline() {
    auth.playOffline();
    router.push("/home/overview");
}

if (hasCredentials && settingsStore.loginAutomatically) {
    console.log("Logging in automatically");
    login();
}
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

.play-offline {
    display: flex;
    align-self: center;
    margin-top: 20px;
    font-size: 32px;
    opacity: 0.3;
    &:hover {
        opacity: 1;
    }
}

.login-button {
    align-self: center;
    width: 500px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 20px 40px;
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.login-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}

.login-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}

.login-button:hover::before {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
}

.buttons-container {
    display: flex;
    gap: 20px;
    flex-direction: column;
    align-items: center;
}
</style>
