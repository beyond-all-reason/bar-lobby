<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div @contextmenu="onRightClick">
        <TeamParticipant>
            <div class="flex-row flex-center">
                <GameIconsVelociraptor v-if="isRaptor(bot)" />
                <Icon v-else-if="isScavenger(bot)" :icon="robotAngry" />
                <Icon v-else :icon="robot" />
            </div>
            <div>{{ bot.name }}</div>
            <div class="flex-row flex-right">
                <div class="flex-row flex-center"><Icon :icon="desktopTower" /></div>
                <div class="hostname">{{ hostName }}</div>
            </div>
        </TeamParticipant>
        <LuaOptionsModal
            :id="`configure-bot-${bot.name}`"
            :title="t('lobby.components.battle.botParticipant.configureBot')"
            v-model="botOptionsOpen"
            :options="{}"
            :sections="botOptions"
            @set-options="setBotOptions"
        />
        <ContextMenu ref="menu" :model="actions" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import robotAngry from "@iconify-icons/mdi/robot-angry";
import desktopTower from "@iconify-icons/mdi/desktop-tower";
import { Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import { LuaOptionSection } from "@main/content/game/lua-options";
import ContextMenu from "primevue/contextmenu";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import GameIconsVelociraptor from "@renderer/components/icons/GameIconsVelociraptor.vue";
import { computedAsync } from "@vueuse/core";
import { getUserByID } from "@renderer/store/users.store";
//import { LobbyUpdateBotRequestData } from "tachyon-protocol/types";
import { User } from "@main/model/user";
import { lobby } from "@renderer/store/lobby.store";

const { t } = useTypedI18n();

const props = defineProps<{
    bot: LobbyBot;
    teamId: string;
    hostId: string;
    botId: string;
}>();

interface LobbyBot {
    id: string;
    allyTeam: string;
    team: string;
    player: string;
    name?: string;
    shortName?: string;
    version: string | null;
    options: {
        [k: string]: string | null;
    } | null;
}

const botOptions: Ref<LuaOptionSection[]> = ref([]);
const botOptionsOpen = ref(false);
const menu = ref<InstanceType<typeof ContextMenu>>();

const actions = [
    {
        label: t("lobby.components.battle.botParticipant.configure"),
        command: configureBot,
    },
    {
        label: t("lobby.components.battle.botParticipant.kick"),
        command: kickBot,
    },
];

// FIXME: This is missing from the update information, so we do not get a host name. This is currently wrong.
const hostName = computedAsync(async () => {
    // User and number is only shown as a placeholder if we have a delay in getting the user's name from the server
    const name = t("lobby.navbar.messages.userID") + " " + props.hostId;
    if (props.hostId) {
        const cached: User = (await getUserByID(props.hostId)) as User;
        if (cached != undefined) {
            return await cached.username;
        }
    }
    return name;
});

function onRightClick(event: MouseEvent) {
    if (menu.value) {
        menu.value.show(event);
    }
}

function kickBot() {
    lobby.requestRemoveBot({ id: props.botId });
}

async function configureBot() {
    botOptions.value =
        [...(enginesStore.selectedEngineVersion?.ais || []), ...(gameStore.selectedGameVersion?.ais || [])].find(
            (ai) => ai.name === props.bot.name
        )?.options || [];
    botOptionsOpen.value = true;
}

function setBotOptions(options: Record<string, unknown>) {
    console.log("bot options:", options);
    //const botOptions:LobbyUpdateBotRequestData = { id: props.botId, options:options}
    //lobby.requestUpdateBot(botOptions);
    //battleActions.updateBotOptions(props.bot, options);
}

function isRaptor(bot: LobbyBot): boolean {
    return bot.shortName === "RaptorsAI";
}

function isScavenger(bot: LobbyBot): boolean {
    return bot.shortName === "ScavengersAI";
}
</script>

<style lang="scss" scoped>
.bot-type {
    opacity: 0.5;
}

.hostname {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    overflow-y: visible;
    scrollbar-width: none;
}
</style>
