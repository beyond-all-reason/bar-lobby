<template>
    <Modal v-model="isOpen" :title="t('lobby.views.index.needToLogIn')">
        <div class="container flex-col gap-lg">
            <div>{{ t("lobby.views.index.needToLogInToAccess") }}</div>
            <Button class="quick-play-button fullwidth" @click="onlogIn">
                {{ t("lobby.views.index.login") }}
            </Button>

            <Button class="quick-download-button fullwidth red" @click="onCancel">
                {{ t("lobby.views.index.playOffline") }}
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { useTypedI18n } from "@renderer/i18n";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { RouteLocationNormalized } from "vue-router";

const { t } = useTypedI18n();

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
        intendedRoute?: RouteLocationNormalized | null;
    }>(),
    { modelValue: false, intendedRoute: null }
);

const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();
const router = useRouter();

const isOpen = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit("update:modelValue", v),
});

function onlogIn() {
    isOpen.value = false;
    const redirect = props.intendedRoute?.fullPath ?? "/play";
    router.push({ path: "/", query: { redirect } });
}
function onCancel() {
    isOpen.value = false;
}
</script>

<style lang="scss" scoped>
.container {
    width: 352px;
    gap: 20px;
}

.quick-download-button {
    align-self: center;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.4rem;
    padding: 10px 40px;
    color: #fff;
    border: none;
    border-radius: 2px;
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.quick-play-button {
    align-self: center;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.4rem;
    padding: 10px 40px;
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

.quick-play-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button::before {
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

.quick-play-button:hover::before {
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
}
</style>
