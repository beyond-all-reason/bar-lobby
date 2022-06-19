<template>
    <div :class="`battle-preview ${layout}`" @click="attemptJoinBattle">
        <template v-if="layout === 'tile'">
            <div class="background" :style="`background-image: url('${mapImageUrl}')`" />
            <div class="header">
                <div class="title">
                    <div>
                        <Flag :countryCode="founder.countryCode" />
                    </div>
                    <div>
                        <Icon v-if="battle.locked || battle.passworded" :icon="lock" />
                    </div>
                    <div>
                        {{ battle.title }}
                    </div>
                </div>
                <div>Preset (TODO)</div>
            </div>
            <div class="header meta">
                <div>
                    {{ mapName }}
                </div>
                <div>
                    {{ runtime }}
                </div>
            </div>
            <div class="clients players">
                <div v-for="player in players" :key="player.userId" class="client">
                    <div v-if="player.countryCode">
                        <Flag :countryCode="player.countryCode" />
                    </div>
                    <div>
                        {{ player.username }}
                    </div>
                </div>
                <div v-for="(bot, i) in battle.botNames" :key="i" class="client">
                    <div>
                        <Icon :icon="robot" />
                    </div>
                    <div>
                        {{ bot }}
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
                    <Icon v-if="battle.locked || battle.passworded" :icon="lock" />
                </div>
            </div>
            <div>
                {{ battle.title }}
            </div>
            <div>TODO</div>
            <div>
                {{ battle.mapName }}
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
                            {{ battle.botNames.length }}
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
import { computed, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Flag from "@/components/misc/Flag.vue";
import type { BattlePreviewType } from "@/model/battle/battle-preview";

const props = defineProps<{
    battle: BattlePreviewType;
    layout: "tile" | "row";
}>();

const users = computed(() => props.battle.userIds.map((id) => api.session.getUserById(id)!));
const players = computed(() => users.value.filter((user) => !user.battleStatus?.spectator));
const spectators = computed(() => users.value.filter((user) => user?.battleStatus?.spectator));
const founder = computed(() => api.session.getUserById(props.battle.founderId)!);
const map = computed(() => api.content.maps.getMapByScriptName(props.battle.mapName));
const mapImageUrl = computed(() => (map.value ? `file://${map.value.textureImagePath}` : require("@/assets/images/default-minimap.png")));
const mapName = computed(() => (map.value ? map.value.friendlyName : api.content.maps.scriptNameToFriendlyName(props.battle.mapName)));
const runtime = computed(() => {
    if (!props.battle.startTime) {
        return null;
    }
    const ms = useNow({ interval: 1000 }).value.getTime() - props.battle.startTime.getTime();
    const runtimeDate = new Date(ms);
    const hours = (runtimeDate.getHours() - 1).toString().padStart(2, "0");
    const minutes = runtimeDate.getMinutes().toString().padStart(2, "0");
    const seconds = runtimeDate.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
});

const attemptJoinBattle = async () => {
    if (props.battle.passworded) {
        passwordPromptOpen.value = true;
    } else {
        await api.comms.request("c.lobby.join", {
            lobby_id: props.battle.id,
        });
    }
};

const passwordPromptOpen = ref(false);
const onPasswordPromptSubmit: (data: { password?: string }) => Promise<void> = async (data) => {
    const response = await api.comms.request("c.lobby.join", {
        lobby_id: props.battle.id,
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
            &:before {
                @extend .fullsize;
                background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 10%, rgba(0, 0, 0, 0) 100%);
                box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 1px 0 0 0 rgba(255, 255, 255, 0.07), inset -1px 0 0 0 rgba(255, 255, 255, 0.07), inset 0 -5px 0 0 rgba(0, 0, 0, 0.3);
            }
        }
        .clients {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 4px;
            &--spectators {
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
