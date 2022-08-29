<template>
    <div class="battle-preview" @click="attemptJoinBattle">
        <div class="background" :style="`background-image: url('${mapImageUrl}')`" />
        <div class="header">
            <div class="title">
                <div class="flex-row flex-center gap-sm">
                    <Flag :countryCode="battle.founder.value.countryCode" />
                    <Icon v-if="battle.battleOptions.locked" :icon="lock" />
                    <Icon v-if="battle.battleOptions.passworded" :icon="key" />
                    {{ battle.battleOptions.title }}
                </div>
            </div>
            <div>{{ battle.map.value?.friendlyName ?? battle.battleOptions.map }}</div>
        </div>
        <div class="header meta">
            {{ battle.friendlyRuntime.value }}
        </div>
        <div class="clients players">
            <div v-for="player in battle.players.value" :key="player.userId" class="client">
                <Flag :countryCode="player.countryCode" />
                <div>
                    {{ player.username }}
                </div>
            </div>
            <div v-for="(bot, i) in battle.bots" :key="i" class="client">
                <Icon :icon="robot" />
                {{ bot.name }}
            </div>
        </div>
        <div v-if="battle.spectators.value.length" class="clients spectators">
            <div v-for="spectator in battle.spectators.value" :key="spectator.userId" class="client">
                <Flag :countryCode="spectator.countryCode" />
                {{ spectator.username }}
            </div>
        </div>

        <Modal v-model="passwordPromptOpen" title="Battle Password" @submit="onPasswordPromptSubmit">
            <div class="flex-col gap-md">
                <p>Please enter the password for this battle</p>
                <Textbox type="password" name="password" />
                <Button type="submit">Submit</Button>
            </div>
        </Modal>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import key from "@iconify-icons/mdi/key";
import lock from "@iconify-icons/mdi/lock";
import robot from "@iconify-icons/mdi/robot";
import { computed, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Flag from "@/components/misc/Flag.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";

const props = defineProps<{
    battle: AbstractBattle;
}>();

const mapImageUrl = computed(() => (props.battle.map.value ? `file://${props.battle.map.value.textureImagePath}` : require("@/assets/images/default-minimap.png")));

const attemptJoinBattle = async () => {
    if (props.battle.battleOptions.passworded) {
        passwordPromptOpen.value = true;
    } else {
        await api.comms.request("c.lobby.join", {
            lobby_id: props.battle.battleOptions.id,
        });
    }
};

const passwordPromptOpen = ref(false);
const onPasswordPromptSubmit: (data: { password?: string }) => Promise<void> = async (data) => {
    const response = await api.comms.request("c.lobby.join", {
        lobby_id: props.battle.battleOptions.id,
        password: data.password,
    });
    if (response.result === "failure") {
        api.alerts.alert({
            type: "notification",
            severity: "error",
            content: "The password you entered was invalid.",
        });
    } else {
        passwordPromptOpen.value = false;
    }
};
</script>

<style lang="scss" scoped>
.battle-preview {
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 0;
    padding-bottom: 5px;
    gap: 5px;
    padding: 10px;
    font-weight: 500;
    &:hover {
        .background {
            filter: brightness(1.1);
        }
    }
    .header,
    .meta {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
    }
    .header {
        font-weight: 600;
    }
    .meta {
        font-size: 16px;
    }
    .title {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
    }
    .background {
        @extend .fullsize;
        left: 0;
        top: 0;
        image-rendering: pixelated;
        z-index: -1;
        background-position: center;
        background-size: cover;
        overflow: hidden;
        filter: brightness(0.9);
        &:before {
            @extend .fullsize;
            left: 0;
            top: 0;
            transition: all 0.05s;
            background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));
        }
        &:after {
            @extend .fullsize;
            left: 0;
            top: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
    }
    .clients {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 4px;
        &.spectators {
            position: relative;
            padding-top: 5px;
            &:before {
                content: "";
                position: absolute;
                top: 0;
                left: 2.5%;
                width: 95%;
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
            }
        }
    }
    .client {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.6);
        border: none;
        font-size: 14px;
        font-weight: 500;
        svg {
            width: 14px;
            height: 14px;
        }
        .flag {
            font-size: 12px;
            vertical-align: middle;
        }
    }
}
</style>
