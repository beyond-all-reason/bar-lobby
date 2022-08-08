<template>
    <div :class="`battle-preview ${layout}`" @click="attemptJoinBattle">
        <template v-if="layout === 'tile'">
            <div class="background" :style="`background-image: url('${mapImageUrl}')`" />
            <div class="header">
                <div class="title">
                    <div class="flex-col flex-center">
                        <Flag :countryCode="founder.countryCode" />
                    </div>
                    <div class="flex-col flex-center">
                        <Icon v-if="battle.battleOptions.locked || battle.battleOptions.passworded" :icon="lock" />
                    </div>
                    <div class="flex-col flex-center">
                        {{ battle.battleOptions.title }}
                    </div>
                </div>
                <div>{{ mapName }}</div>
            </div>
            <div class="header meta">
                {{ runtime }}
            </div>
            <div class="clients players">
                <div v-for="player in players" :key="player.userId" class="client">
                    <div v-if="player.countryCode && player.countryCode !== '??'">
                        <Flag :countryCode="player.countryCode" />
                    </div>
                    <div>
                        {{ player.username }}
                    </div>
                </div>
                <div v-for="(bot, i) in battle.bots" :key="i" class="client">
                    <div class="flex-col flex-center">
                        <Icon :icon="robot" />
                    </div>
                    <div class="flex-col flex-center">
                        {{ bot.name }}
                    </div>
                </div>
            </div>
            <div v-if="spectators.length" class="clients spectators">
                <div v-for="spectator in spectators" :key="spectator.userId" class="client">
                    <div v-if="spectator.countryCode">
                        <Flag :countryCode="spectator.countryCode" />
                    </div>
                    <div>
                        {{ spectator.username }}
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
            <div>
                <div class="flex-center fullheight">
                    <Flag :countryCode="founder.countryCode" />
                </div>
            </div>
            <div>
                <div class="flex-center fullheight">
                    <Icon v-if="battle.battleOptions.locked || battle.battleOptions.passworded" :icon="lock" />
                </div>
            </div>
            <div>
                {{ battle.battleOptions.title }}
            </div>
            <div>TODO</div>
            <div>
                {{ battle.battleOptions.map }}
            </div>
            <div>
                <div class="flex-row gap-md">
                    <div class="flex-row gap-sm">
                        <img src="@/assets/images/icons/com.png" style="height: 23px" />
                        <div style="width: 2ch">
                            {{ players.length }}
                        </div>
                    </div>
                    <div class="flex-row gap-sm">
                        <Icon :icon="robot" />
                        <div style="width: 2ch">
                            {{ battle.bots.length }}
                        </div>
                    </div>
                    <div class="flex-row gap-sm">
                        <Icon :icon="eyeOutline" />
                        <div style="width: 2ch">
                            {{ spectators.length }}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                {{ runtime }}
            </div>
        </template>

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
import eyeOutline from "@iconify-icons/mdi/eye-outline";
import lock from "@iconify-icons/mdi/lock";
import robot from "@iconify-icons/mdi/robot";
import { useNow } from "@vueuse/core";
import { formatDuration } from "date-fns";
import { computed, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Flag from "@/components/misc/Flag.vue";
import { AbstractBattle } from "@/model/battle/abstract-battle";

const props = defineProps<{
    battle: AbstractBattle;
    layout: "tile" | "row";
}>();

const users = computed(() => Array.from(props.battle.userIds.values()).map((id) => api.session.getUserById(id)!));
const players = computed(() => users.value.filter((user) => !user.battleStatus?.isSpectator));
const spectators = computed(() => users.value.filter((user) => user?.battleStatus?.isSpectator));
const founder = computed(() => api.session.getUserById(props.battle.battleOptions.founderId)!);
const map = computed(() => api.content.maps.getMapByScriptName(props.battle.battleOptions.map));
const mapImageUrl = computed(() => (map.value ? `file://${map.value.textureImagePath}` : require("@/assets/images/default-minimap.png")));
const mapName = computed(() => (map.value ? map.value.friendlyName : api.content.maps.scriptNameToFriendlyName(props.battle.battleOptions.map)));
const runtime = computed(() => {
    if (!props.battle.battleOptions.startTime) {
        return null;
    }
    const ms = useNow({ interval: 1000 }).value.getTime() - props.battle.battleOptions.startTime.getTime();
    const runtimeDate = new Date(ms);
    const hours = runtimeDate.getHours() - 1;
    const minutes = runtimeDate.getMinutes();
    const seconds = runtimeDate.getSeconds();
    return `Running for ${formatDuration({ hours, minutes, seconds })}`;
});

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
    &.tile {
        position: relative;
        z-index: 0;
        padding-bottom: 5px;
        gap: 5px;
        padding: 10px;
        font-weight: 500;
        &:hover {
            .background {
                filter: brightness(1.3);
                &:before {
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
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
            image-rendering: pixelated;
            z-index: -1;
            background-position: center;
            background-size: cover;
            overflow: hidden;
            filter: brightness(1);
            &:before {
                @extend .fullsize;
                transition: all 0.05s;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.15);
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
            svg {
                width: 14px;
                height: 14px;
            }
            .flag {
                font-size: 10px;
            }
        }
    }
    &.row {
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 0%, rgba(255 255 255 / 0.02) 100%);
    }
}
</style>
